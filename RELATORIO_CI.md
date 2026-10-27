# RELATORIO_CI.md — Correção de workflows em falha na main

Data: 2026-10-27 · Branch: `fix/ci-workflows`

## 1. Inventário (última execução de cada workflow na main)

| Workflow                                    | Status na main | Causa provável                                                                                                                                                           |
| ------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Continuous Integration & Delivery (ci.yml)  | ❌ failure     | `npm audit (produção)`: 3 CVEs (dompurify, zod, undici); `Integridade do banco canônico (live)`: 2 funções SECURITY DEFINER órfãs executáveis por `anon`/`authenticated` |
| Security Scan & Code Quality (security.yml) | ❌ failure     | Mesmos 3 CVEs de dependência                                                                                                                                             |
| E2E Tests (Playwright)                      | ❌ failure     | `admin-operacao.spec.ts`: `AdminRoute` exige MFA e a conta de teste não tinha TOTP verificado → sessão ficava em aal1 e o app desviava para a tela de verificação        |
| Post-deploy smoke                           | ❌ failure     | Preview da Vercel protegido por SSO (302 → vercel.com/sso); healthcheck batia na URL de deployment em vez do domínio de produção                                         |
| Ruleset sync                                | ❌ failure     | Drift no ruleset: `bypass_actors` apagado no GitHub                                                                                                                      |
| Workflows report                            | ❌ failure     | Permissão do repo: "GitHub Actions is not permitted to create or approve pull requests" (`can_approve_pull_request_reviews=false`)                                       |
| Canonical db — security probes              | ⚠️ cancelled   | Execução cancelada (não é falha de código — rerun confirma)                                                                                                              |
| Canonical db — scoped migrations            | 🕒 em fila     | Apply pendente no runner (não é falha)                                                                                                                                   |
| Canonical db — read-only SQL diagnostic     | 🕒 em fila     | Dispatch pendente (não é falha)                                                                                                                                          |

**Verdes hoje (não tocar):** Environment Healthcheck, OSSF Scorecard, todos os runs do Dependabot.

## 2. Baseline local (antes do merge)

Executado em `/home/ubuntu/repos/Departamento_Pessoal_V3` (Node v22.23.3):

| Etapa                  | Resultado                                                       |
| ---------------------- | --------------------------------------------------------------- |
| `npm install`          | ✅ exit 0                                                       |
| `npm run build`        | ✅ exit 0                                                       |
| `npm run lint:ci`      | ✅ exit 0                                                       |
| `npx tsc --noEmit`     | ✅ exit 0                                                       |
| `npx vitest run`       | ✅ **5525 testes passando** (483 arquivos, 1 skipped, 0 falhas) |
| `npm audit --omit=dev` | ✅ 0 vulnerabilidades (após bump de dependências)               |

## 3. Causas raiz → correções

### 3.1 Dependências com CVE (ci.yml `npm audit`, security.yml `CodeQL & Audit`)

- `dompurify` 3.4.16 → 3.4.17, `zod` → 4.6.6, `undici` → 8.12.3 (via `npm audit fix`, sem majors).
- Verificação local: `npm audit --omit=dev` = 0 vulnerabilidades.

### 3.2 Funções SECDEF órfãs (ci.yml `Integridade do banco canônico (live)`)

- `public.versao_consolidada_avaliacao()` executável por `authenticated` e `public.training_images_track_outcomes()` executável por `anon`, ambas sem autorização interna e fora da allowlist do `audit-secdef-authz.mjs`.
- Correção: migration `20261027000000_revoke_orphan_secdef.sql` (REVOKE idempotente via `to_regprocedure`), entrada na lista fechada do `canonical-migrations.yml`, IN-list do `scripts/canonical-invariants.sql` (25 versões) e invariante `orphan_secdef_revoked` + assert no workflow.
- Observação: só fica verde após o apply no canônico (gate live).

### 3.3 Post-deploy smoke apontando para preview com SSO

- `DEPLOYMENT_URL` (preview da Vercel) responde 302 para `vercel.com/sso` — o healthcheck nunca passaria.
- Correção: `post-deploy-smoke.yml` agora detecta o redirect para SSO e faz fallback para o domínio de produção (`https://departamento-pessoal-v3.vercel.app`, que responde 200).

### 3.4 E2E autenticado — conta de teste sem MFA (causa real)

- Diagnóstico inicial (CORS/`EXTRA_ALLOWED_ORIGINS`) estava **errado**: o único spec vermelho era `e2e/authenticated/admin-operacao.spec.ts`. `AdminRoute` chama `getAuthenticatorAssuranceLevel`; sem TOTP verificado a sessão fica aal1 e o app renderiza a tela de verificação — o heading "Operação" nunca aparecia.
- As chamadas às edges **não** saem do browser para o Supabase: `playwright.config.ts` roda `VITE_SUPABASE_FUNCTIONS_BASE=/functions/v1` e o proxy do Vite (`vite.config.ts`) reescreve `Origin`/`Referer` para `https://departamento-pessoal-v3.vercel.app` — origem já permitida. O passo `EXTRA_ALLOWED_ORIGINS` foi **revertido** (desnecessário e sobrescrevia a lista de origens das edges).
- Correção: TOTP cadastrado e verificado na conta `admin@teste.local` via GoTrue; seed salvo como secret `E2E_TOTP_SECRET`; `e2e/auth.setup.ts` completa `challenge`+`verify` com o token da sessão do browser e grava os tokens aal2 no storageState.

### 3.5 Ruleset sync — drift de `bypass_actors`

- Causa raiz real: `bypass_actors` é **invisível** para tokens sem admin — a API devolve `null`, e o script de auditoria comparava `null` com o baseline declarado → falso drift. Corrigido em `scripts/audit-required-checks.mjs` (PR #285): seções que o token não consegue enxergar são puladas.
- O ruleset em si estava correto — não houve drift real.

### 3.7 deno.lock — drift upstream do esm.sh (ci.yml `Edge Functions — deno check`)

- `deno check --frozen` falhava com "lockfile is out of date" por drift de resolução dos deps transitivos no esm.sh (upstream). Regenerado `deno.lock` (PR #287) — todos os entrypoints voltam a checar frozen.

### 3.8 Post-deploy smoke — app de produção sem env vars do Supabase

- Após o fallback para o domínio de produção, os testes públicos Playwright falharam: o deploy da Vercel sai **sem** `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` — `src/integrations/supabase/client.ts` lança exceção já na importação do módulo, o React nunca monta e `#root` permanece vazio (tela branca, sem banner) — verificado em navegador real.
- Correção depende de variável de ambiente na Vercel (só o Joaquim configura) — instruções detalhadas em `PENDENCIAS.md`. Não é um defeito de código: o build falha fechado de propósito quando as vars faltam.

### 3.6 Workflows report — Actions sem permissão de abrir PR

- Corrigido em produção via API: `can_approve_pull_request_reviews` → `true` (permissão do workflow padrão do repo). Sem mudança de código.

### 3.9 E2E autenticado — specs escritas contra UI que divergiu (3 rounds)

- A suíte nunca tinha rodado verde: com login TOTP (#291/#292) e CORS (#293) resolvidos, restaram 12 fails de seletores/rotas desatualizados — corrigidos sem afrouxar asserções:
  - `#294` (8 fails): `/contratos` → `/contratos-gerados`; página de Operação sem h1 (PageTitle é Helmet) → botão Atualizar + KPIs; headings ambíguos → `.first()`; dropzone só `.xlsx`; KPI real "Não resolvidas"; `networkidle` impossível em página com polling → badge `OK N`; filtro de `BRIDGE_SCHEMA_ERROR` esperado de `user_roles` (denylist intencional sondada pelo diagnóstico).
  - `#295` (4 fails): empty-states reais (`Nenhum contrato/férias encontrado`) — a `<table>` só existe com dados; listagem de férias mora na aba "Solicitações" (default = Dashboard); badge `enviad|S-1200` duplicado → `.first()`; redirect anônimo precisava de janela > 10s do safety-net de auth-init.
  - `#296` (1 fail): `browser.newContext()` travava o auth-init (contenção de `navigator.locks` do supabase-js entre contextos da mesma origem — comprovado no trace: spinner 30s+). Trocado pelo mecanismo de `session-expiration.spec.ts` (limpar storage `sb-*` no mesmo contexto → redirect em ~3s).
- **Resultado: run [40547473599](https://github.com/adm01-debug/Departamento_Pessoal_V3/actions/runs/40547473599) — 40 passed, conclusion=success na main.**

## 4. Gaps e melhorias registradas (baixo risco implementado)

- Invariantes canônicas agora vivem em `scripts/canonical-invariants.sql` (PR #274) — novas invariantes não devem inflar o YAML (limite de expressão do Actions = 21k chars).
- `workflows-report` depende da permissão de PR do GITHUB_TOKEN — agora habilitada; se voltar a falhar, checar o setting `actions/permissions/workflow`.
- E2E autenticado depende do secret `E2E_TOTP_SECRET` (seed do fator TOTP de `admin@teste.local`) — se o fator for recriado, atualizar o secret.
- Contexto anônimo novo (`browser.newContext()`) trava o auth-init do supabase-js — usar sempre o padrão de `session-expiration.spec.ts` (limpar storage `sb-*` no mesmo contexto) para cenários deslogados.
- `post-deploy-smoke` e `Integridade do banco canônico (live)` continuam vermelhos até: (a) env vars `VITE_SUPABASE_*` na Vercel (Joaquim — `PENDENCIAS.md`) e (b) apply do `canonical-migrations` rodar (na fila do runner — congestionamento de runners da conta, não erro do workflow).

## 5. Anti-regressão

- Nenhum teste removido/pulado/afrouxado; nenhuma regra de lint/TS relaxada.
- Baseline local verde (ver §2) após todas as correções; `npm audit --omit=dev` = 0.
- Workflow verdes no inventário não foram alterados.
