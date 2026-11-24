# Revisão da Implementação — Plano 100 Workflows

**Data:** 15/10/2026
**Wave:** 0 (PR #231, merged 14/10) + Wave 1 (concluída) + Wave 2 (15/10) + Wave 3 (15/10) + Wave 4 (15/10, PR #238) + Wave 5 (15/10, PR #238) + Wave 6 (15/10, PR #238 — revisão do Codex + Bloco G canônicos)
**Branch:** `claude/happy-cori-3z9h7f`
**Score estimado:** 8.5/10 (era 6.5/10 pré Wave 4-6)

## Wave 0 — Concluído (PR #231, merged 14/10/2026)

| Código | Descrição                                                      | Evidência               |
| ------ | -------------------------------------------------------------- | ----------------------- |
| W01    | bun.lock regenerado (lockfileVersion:3, Bun 1.4.2)             | commit 80192e2          |
| W02    | Gate lockfile-parity em security-config                        | commit 80192e2          |
| W35    | SHA comments corrigidos (v4→v7) + action-pins.json             | commit 80192e2          |
| W38    | node-version-file em todos os workflows                        | commits 135b527/3981dfe |
| W40    | @lhci/cli devDep; eliminar npx -y                              | commit 135b527          |
| W53    | ratchet-lint-warnings patch automático                         | commit 80192e2          |
| W54    | Contrato edge movido para security-config                      | commit 80192e2          |
| W82    | CodeQL: 9 alertas js/unused-local-variable                     | commit 80192e2          |
| W94    | CLAUDE.md atualizado                                           | commit 80192e2          |
| W95    | Comentário D26 em format:check:changed                         | commit 80192e2          |
| W96    | Label ci→ci-main no job rls-live                               | commit 80192e2          |
| W97    | Contract test: 11 contratos, checks 10/11 promovidos WARN→FAIL | commits 6b8c7a7         |
| W98    | lockfile-parity.test.sh criado                                 | commit 80192e2          |

## Wave 1 — Concluído (branch claude/happy-cori-3z9h7f)

| Código | Descrição                                                                   | Evidência               |
| ------ | --------------------------------------------------------------------------- | ----------------------- |
| W09    | Issue dedup em healthcheck e rls-live (título estável, --limit 1, stale 7d) | commits f4e211a/adc9ee2 |
| W10    | Documentação bun.lock post-update Dependabot                                | commit a1f9832          |
| W17    | audit-required-checks.mjs: TODO live API anotado                            | commit acc6c19          |
| W31    | infra/github/apps.md: inventário de 8 GitHub Apps                           | commit a1f9832          |
| W36    | canonical-edge-functions: --no-lock removido                                | commit 5d7f30b          |
| W41    | postgresql-client-17 pinado em 4 workflows                                  | commit 5b61cc2          |
| W42    | Dependabot: cooldown 7d + open-pull-requests-limit 5                        | commit a1f9832          |
| W45    | npm cache em 6 setup-node steps em ci.yml                                   | commit f4e211a          |
| W49    | Concurrency per-SHA para pushes na main                                     | commit acc6c19          |
| W51    | GITHUB_STEP_SUMMARY em security-config/p0/db-integrity                      | commit 5b61cc2          |
| W61    | workflow_dispatch em e2e.yml (inputs: project, ref)                         | commit acc6c19          |
| W65    | E2E authenticated: timeout 30→20 min                                        | commit acc6c19          |
| W77    | Concorrência compartilhada canonical-database (3 workflows)                 | commit 5b61cc2          |
| W79    | CANONICAL_WORKFLOWS.md runbook reescrito                                    | commit 5b61cc2          |
| W81    | CodeQL: security-extended (remove noise de quality)                         | commit 1976e66          |
| W82+   | CodeQL: +50 alertas js/unused-local-variable em src/pages/hooks             | commits 102acdc/9faf116 |
| W83    | npm audit --omit=dev --audit-level=high gate em CI                          | commit 5b61cc2          |
| W84    | dependency-review-action em PRs (high severity + copyleft)                  | commit 5b61cc2          |
| W88    | CodeQL: build-mode none; schedule quinta 06:47 UTC                          | commit 1976e66          |

## Wave 2 — Concluído (branch claude/happy-cori-3z9h7f, 15/10/2026)

| Código  | Descrição                                                                                   | Evidência      |
| ------- | ------------------------------------------------------------------------------------------- | -------------- |
| W86-fix | workflow-lint.yml: `./actionlint` → `actionlint` (PATH) — bug que causava command not found | commit 78dd009 |
| W87     | deploy.yml: publicar dist/ artifact (v7, 7d) + gate de auditoria de bundle                  | commit 78dd009 |
| W69     | canonical-migrations.yml: ledger dinâmico (sem hardcode) + runner de sidecars .verify.sql   | commit 78dd009 |
| W94     | CLAUDE.md: sessão 7 registrada, métricas atualizadas (12/12 workflows)                      | commit 6a3cf89 |

**Impacto Wave 2:**

- workflow-lint.yml agora executa actionlint de fato (era no-op silencioso)
- deploy.yml bloqueia merge se bundle ultrapassar orçamento (js_total 12250KB, chunk 2000KB, css 220KB)
- canonical-migrations.yml não vai quebrar em futuras ondas com versões diferentes
- Contract test sobe para 12/12 (detectou e validou fix do W86)

## Wave 3 — Concluído (branch claude/happy-cori-3z9h7f, 15/10/2026)

| Código | Descrição                                                                                                               | Evidência    |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| W12    | Ruleset 21934736: 7 → 9 required checks via API (adicionados "Playwright público (PR)" e "Build")                       | API call     |
| W13    | Proteção clássica de branch removida via API — ruleset é agora a única fonte de proteção (fix D2)                       | API call     |
| W33    | sha_pinning_required=true via API — todas as actions precisam de SHA pin                                                | API call     |
| W34    | allowed_actions=selected via API — allowlist (github_owned + verified + denoland, oven-sh, ossf, SonarSource, supabase) | API call     |
| W17    | audit-required-checks.mjs: comparação live via GITHUB_TOKEN + detecção de divergência baseline↔ruleset vivo             | scripts edit |
| W30    | validate-canonical-db-url.mjs + audit-canonical-project.mjs: CANONICAL_SUPABASE_REF env var com fallback                | scripts edit |

**Impacto Wave 3:**

- Ruleset forçado com SHA pinning — supply chain hardened
- Allowlist de actions: GitHub owned + verified + 5 trusted vendors (sem ações arbitrárias de terceiros)
- Proteção clássica removida — elimina conflito histórico (D2) com ruleset
- audit-required-checks.mjs agora valida divergência ao vivo quando GITHUB_TOKEN disponível
- Scripts de auditoria canonicalizados: aceitam var de ambiente para project ref (W30)
- W85 ❌: secret_scanning_non_provider_patterns + validity_checks requerem GHAS — não disponível no plano atual

## Decisões do Owner — Resolvidas

| Código | Decisão                                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| W03 ✅ | **npm único.** bun.lock removido; `npm ci` em CI/E2E/deploy/Docker; gate `lockfile-single` em security-config                 |
| W14 ✅ | **0 aprovações + code owner em caminhos sensíveis.** Ruleset aplicado; CODEOWNERS estreito commitado com autorização do owner |

**W03 — evidência:** `package-lock.json` estava sem `@lhci/cli` e ~260 dependências transitivas (só no `bun.lock`) — drift D1 ativo. Regenerado; `npm ci` limpo (966 pacotes); typecheck, lint:ci, build e bundle budget verdes. Dockerfiles corrigidos de `node:26` para `node:22` (alinhado a `engines` + `engine-strict`) e passaram a usar o lockfile. Pós-merge: remover `oven-sh/*` da allowlist de actions (W34) — não é mais usado.

**W14 — evidência:** com 1 aprovação obrigatória, stale-dismiss e proibição de auto-aprovação, todo PR (agentes, Dependabot, owner) dependia do bypass do owner. Ruleset 21934736 aplicado via API: `required_approving_review_count: 0`, `require_code_owner_review: true`. Mantidos: conversas resolvidas, linear history, squash/rebase, force-push/deleção bloqueados. **Pendente:** o CODEOWNERS atual tem `* @adm01-debug`, então o efeito ainda é aprovação do owner em todo PR (igual a antes). A versão estreita (sem `*`; owner só em `.github/`, `infra/`, `supabase/migrations/`, `supabase/config.toml`, `external-db-bridge/`, `functions/_shared/`, Dockerfiles, `docker-compose.prod.yml`, `nginx.conf`, `vercel.json`, `.npmrc`) foi preparada, mas o commit foi barrado pela política de segurança do agente e aguarda o owner commitá-la ou liberar a ação.

**Demais decisões (critério: qualidade + velocidade + custo zero):**

| Código | Decisão                                                                                                                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W25 🟡 | `db-integrity` (required) virou estático, sem segredo; auditorias reais em `db-integrity-live` (main/dispatch, `environment: production`). Os gates leem o catálogo de produção, que PR não altera. **Owner:** copiar `SUPABASE_DB_URL` para o environment Production e apagar o secret do repositório        |
| W26 ✅ | Sem revisor obrigatório no environment: travaria os probes agendados. A branch policy do environment já restringe quem recebe o segredo                                                                                                                                                                       |
| W21 ✅ | **Manter público.** Privado perde Actions ilimitado, CodeQL, dependency-review e secret scanning gratuitos                                                                                                                                                                                                    |
| W32 ✅ | Coberto pelo W14: code owner obrigatório nos caminhos sensíveis vale para qualquer autor, inclusive agentes                                                                                                                                                                                                   |
| W50 🔓 | **Desbloqueado na Wave 6** — CODEOWNERS estreito confirmado sem `* @adm01-debug` (W19 resolvido). Auto-merge do Dependabot já não depende de nenhum pré-requisito técnico pendente. **Aguardando decisão explícita do dono** para habilitar `allow_auto_merge` — não é ativado sem esse OK.                   |
| W58 ✅ | **Aplicado na Wave 6.** Alvo E2E = projeto canônico com usuários sintéticos; usuários E2E confirmados existentes (Sessão 8) e seed de empresa/colaboradores/folha aplicado ao vivo (W59/W60) — dono confirmou dados mock/fake para validação de design, não PII real. Não é mais "pendente de criar usuários" |
| W63 ✅ | Não contratar Mailosaur. `reset-password-callback.spec.ts` já é pulada sem os secrets; nenhuma mudança                                                                                                                                                                                                        |
| W85 ✅ | Não contratar GHAS. Encerrado                                                                                                                                                                                                                                                                                 |
| W93 ✅ | Não construir N8N/WhatsApp. O healthcheck já abre issue, o que gera notificação do GitHub                                                                                                                                                                                                                     |

## Wave 4 — Concluído (branch claude/happy-cori-3z9h7f, 15/10/2026, PR #238)

| Código  | Descrição                                                                                                                                                                                                                                 | Evidência                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| W15     | db-integrity-live fail-closed de verdade: separa estático (PR) de live (main/dispatch/PR interno)                                                                                                                                         | commit 27c3e5431                                                                                                     |
| W41     | postgresql-client-16 fixo em ci.yml/canonical-migrations.yml/canonical-sql-diag.yml                                                                                                                                                       | commit e84385215                                                                                                     |
| W61     | workflow_dispatch em e2e.yml com inputs project/ref                                                                                                                                                                                       | commit e84385215                                                                                                     |
| W25 ✅  | SUPABASE_DB_URL movido para o environment Production; secret do repo deletado; validado por dispatch real (run 38757125758, sucesso)                                                                                                      | API calls                                                                                                            |
| W28-fix | INSERT de telemetria em audit_log corrigido (colunas inexistentes detalhes/nivel/fonte + violação de CHECK acao); validado com INSERT real + rollback impossível por trigger append-only (linha de teste permanece, marcada test_w28_fix) | commit cab4c42ce                                                                                                     |
| W37     | deno-version v2.x → v2.1.x (Edge Runtime roda release compatível com Deno 2.1 desde 15/08/2025, changelog oficial)                                                                                                                        | commit 85775035d                                                                                                     |
| W43     | deploy.yml assina dist/ com actions/attest-build-provenance (OIDC); permissions id-token/attestations                                                                                                                                     | commit 85775035d                                                                                                     |
| W44     | ossf-scorecard.yml novo: semanal + dispatch, publica em Security → Code scanning                                                                                                                                                          | commit 85775035d                                                                                                     |
| —       | Correção de allowlist: patterns_allowed real só tinha denoland/\*,supabase/\* (doc de 15/10 descrevia ossf/\*,SonarSource/\* como aplicados — não estavam); adicionado ossf/\* via API                                                    | API call                                                                                                             |
| W23     | Migration `20261015160000_ci_auditor_readonly_role.sql`: role ci_auditor (LOGIN, sem SUPERUSER/CREATEDB/CREATEROLE, SELECT em pg_catalog/information_schema/cron.job, REVOKE explícito de public)                                         | commit 85775035d — **não aplicada ainda**: environment Production só libera branch main, PR precisa mergear primeiro |
| W64     | post-deploy-smoke.yml roda Playwright público contra a URL real do deployment (não só healthcheck); issue dedup em falha (label post-deploy-smoke)                                                                                        | commit 7d84a968d                                                                                                     |

**Validado nesta wave:**

- Contrato de workflows (W97): 13/13 limpos, incluindo os 2 workflows novos/alterados.
- `audit-migration-style.mjs`: migration W23 passa (29 migrations desde o cutoff, sem DROP POLICY solto).
- SHAs de `ossf/scorecard-action` e `actions/attest-build-provenance` resolvidos via API a partir da tag assinada (não digitados de memória) — `fa7117d…` (v2.5.0) e `4d10147…` (v4.2.2).
- `action-pins.json` sincronizado com os 2 pins novos.

**W23/W24 — concluído de verdade (não só preparado):** aplicado diretamente em produção via MCP antes do merge (o environment Production só libera `canonical-migrations.yml` para a branch `main`, então a migração formal fica para depois do merge — mas o estado final já existe agora). Role `ci_auditor` confirmado em produção: `rolsuper=false, rolcreatedb=false, rolcreaterole=false, rolcanlogin=true, rolconnlimit=5`. Secret `SUPABASE_DB_URL_READONLY` criado no repositório. `db-integrity-live` já usa esse secret (não mais o admin) incondicionalmente — ver Wave 5.

## Wave 5 — Concluído (branch claude/happy-cori-3z9h7f, 15/10/2026, mesma PR #238)

Esta wave corrigiu 2 regressões reais introduzidas pela própria Wave 4 (achadas pelo CI e por review de bots) e implementou W45.

| Código           | Descrição                                                                                                                                                                                                      | Evidência        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| fix (próprio)    | W37 revertido: pin `deno-version: v2.1.x` quebrava o type-check real (`TS2315` em `criptografia/index.ts:61` — lib TS mais antiga que o `v2.x` flutuante resolvia). Voltou para `v2.x`.                        | commit eb4b75d88 |
| W23/W24 (wiring) | `db-integrity-live` trocado de `environment: production` (bloqueava o job INTEIRO fora de `main` — quebrava em toda PR interna futura) para `SUPABASE_DB_URL_READONLY` incondicional, sem gate de environment. | commit eb4b75d88 |
| Codex review P1  | `e2e.yml` dispatch: `ref` arbitrário rodava credenciais de escrita com código não revisado — validação fail-closed antes do checkout (só `main`/vazio).                                                        | commit e034c3ed6 |
| Codex review P2  | `e2e.yml` dispatch: `project` era decorativo — agora seleciona o projeto Playwright de verdade.                                                                                                                | commit e034c3ed6 |
| SonarCloud (C→A) | `npx playwright` sem versão pinada → `./node_modules/.bin/playwright`; `permissions: read-all` em `ossf-scorecard.yml` → `contents: read`.                                                                     | commit b9e12e4b5 |
| **W45**          | `paths-filter` (dorny, modo API/token) em `ci.yml`: `edge-functions` (required — sucesso explícito por step, nunca "skipped" puro), `p0-database-migrations` e `lighthouse` (skip simples, não required).      | commit 84bf30f63 |

**Validado nesta wave:** SonarCloud Quality Gate passou (0 novos issues) após o fix; contrato de workflows 13/13 em cada commit; YAML de `ci.yml` parseado com `js-yaml` sem erro (13 jobs); 3 threads do Codex review resolvidas com commit citado em cada uma.

## Wave 6 — Concluído (mesma PR #238, squash commit `56a24a104`, 15/10/2026)

Esta wave fechou os achados da revisão do Codex na PR #238 e implementou as 5 sub-tarefas em background do Bloco G
(canônicos, W67–W76) mais o W47 e o W58/W59/W60. A PR foi squash-merged em um único commit (`56a24a104`, parent
`9b35cdd6c`); os commits reais abaixo (pré-squash) ainda estão alcançáveis no histórico local (`git log --all`) e
foram usados como evidência.

**Revisão do Codex — correções:**

| Achado                          | Descrição                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Evidência        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| PII audit (D3)                  | `scripts/audit-rls-pii.mjs`: `information_schema.columns` (filtrada por privilégio) ficava sempre vazia p/ `ci_auditor` → gate de PII/RLS "passava" sem checar nenhuma policy. Troca p/ `pg_attribute`/`pg_class`/`pg_namespace` (catálogo puro); validado ao vivo com a mesma lista de 70 tabelas nas duas versões da query                                                                                                                              | commit 4db0ae169 |
| Guard de ref (dispatch)         | `e2e.yml` (job `playwright`, autenticado): guard exigia só `inputs.ref`; quem dispatch-ava pelo seletor **nativo** de branch do GitHub deixava `inputs.ref` vazio e burlava o guard. Agora exige também `github.ref == 'refs/heads/main'`                                                                                                                                                                                                                 | commit 4db0ae169 |
| Checkout do público             | `e2e.yml` (job `playwright-public`): checkout ignorava `inputs.ref` customizado e sempre testava `github.sha` → agora `ref: inputs.ref \|\| github.sha`                                                                                                                                                                                                                                                                                                   | commit 4db0ae169 |
| `webServer.reuseExistingServer` | `playwright.config.ts`: passa a ser `true` também quando `baseURL != localE2EUrl` — sem isso, o `post-deploy-smoke.yml` (baseURL de um deployment já no ar) sempre quebrava tentando subir servidor novo                                                                                                                                                                                                                                                  | commit 4db0ae169 |
| Checkout do job `changes`       | `ci.yml`: `actions/checkout` (fetch-depth: 0) adicionado antes do `dorny/paths-filter` — sem checkout local, o filtro não calculava diff em push/`workflow_dispatch` e derrubava em cascata o check obrigatório "Edge Functions" via `needs: changes`                                                                                                                                                                                                     | commit 4db0ae169 |
| REVOKE EXECUTE PUBLIC           | **Migration nova `supabase/migrations/20261015170000_ci_auditor_revoke_public_secdef.sql`**: `ci_auditor` conseguia executar 16 funções `SECURITY DEFINER` de negócio (ex. `admissao_salvar_dados`, `admissao_assinar_contrato`) via `GRANT` implícito a `PUBLIC`, contornando RLS. `REVOKE EXECUTE ... FROM PUBLIC` + `GRANT` explícito restaurado p/ `anon`/`authenticated`/`service_role`; validado ao vivo via `has_function_privilege` (0 regressão) | commit 94c302a50 |
| `_shared` no deploy de Edge     | `canonical-edge-functions.yml`: mudança em `supabase/functions/_shared/**` agora força o inventário completo (antes `_shared` podia virar alvo literal inexistente, ou passar sem republicar nenhum consumidor real)                                                                                                                                                                                                                                      | commit 94c302a50 |
| Baseline do deploy              | `canonical-edge-functions.yml`: baseline de "último deploy verde" agora filtra `--event push` — um `workflow_dispatch` manual com `functions` restrito a um subconjunto não conta mais como baseline (esquecia permanentemente as funções fora do retry)                                                                                                                                                                                                  | commit 94c302a50 |
| Sidecar fail-closed             | `canonical-migrations.yml`: `.verify.sql` agora captura a saída do `psql -t -A` e exige que toda linha não-vazia seja literalmente `'ok'` (antes o `psql` saía 0 mesmo retornando `'f'`/`'fail'`)                                                                                                                                                                                                                                                         | commit 94c302a50 |
| Interseção de empresa           | `scripts/e2e/verify-seed.mjs`: `.find()` sem ordenação podia reportar "empresas diferentes" por engano; agora calcula a interseção dos `empresa_id` dos 2 usuários                                                                                                                                                                                                                                                                                        | commit 94c302a50 |
| Labels separados                | Label de incidente `canonical` (compartilhado) → `canonical-probes` (W71) e `canonical-deploy` (W76); `infra/github/labels.json` atualizado                                                                                                                                                                                                                                                                                                               | commit 94c302a50 |
| Slugs removidos no deploy       | `canonical-edge-functions.yml`: `TARGETS` agora é a interseção de `FN_DIFF` (git diff) com `ALL_SLUGS` (filesystem atual) — diretório removido/renomeado não aborta mais o `supabase functions deploy`                                                                                                                                                                                                                                                    | commit 990db1b7e |
| Re-seed E2E                     | **`scripts/e2e/ensure-fixtures.mjs` (novo)**: recria colaboradores/folha da empresa sintética antes do Playwright autenticado (o `cleanup` do W60 os apaga a cada run); não precisa de `SUPABASE_SERVICE_ROLE_KEY` (vínculo usuário↔empresa já é permanente desde o seed)                                                                                                                                                                                 | commit 990db1b7e |
| Drift de migrations fail-closed | `scripts/db/derive-pending-migrations.mjs`: "ausente do ledger" ≠ "seguro aplicar" — falha fechada (`exit 1`) quando `pending_count > 20` (`--max-pending`), apontando para `infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md`; testado com números reais (749 arquivos / 428 no ledger → falha corretamente) e lote simulado (5 → passa)                                                                                                                 | commit 990db1b7e |
| Gate de Edge exercitado         | `ci.yml`: padrão `edge:` do `paths-filter` passa a incluir o próprio `ci.yml` — um PR que só mude a lógica do job `edge-functions` agora de fato seta `edge=true`                                                                                                                                                                                                                                                                                         | commit 990db1b7e |
| SonarCloud/actionlint           | Quality Gate (Security Rating C) resolvido + falha de `actionlint` no CI corrigida                                                                                                                                                                                                                                                                                                                                                                        | commit 078d8468e |

**Bloco G (canônicos) + decisões do owner — sub-tarefas integradas nesta sessão:**

| Código      | Descrição                                                                                                                                                                                                                                                                     | Evidência        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| W47         | `p0-database-migrations` paralelizado em 3 shards via `scripts/tests/run-shard.sh`                                                                                                                                                                                            | commit ee988a899 |
| W59/W60     | Seed E2E (empresa + colaboradores + folha) aplicado **ao vivo** na empresa sintética do canônico (CNPJ `00000000000191`) — dono confirmou que os dados do banco canônico são mock/fake para validação de design, não PII real; cleanup via `e2e/cleanup/seed-cleanup.spec.ts` | commit 6ae859219 |
| W67/W68/W70 | `canonical-migrations.yml`: lista de migrações derivada do ledger (sem hardcode), `apply` via artifact de hash do `validate`, `INSERT` no ledger grava `statements` com o conteúdo real do arquivo                                                                            | commit 2f65436a4 |
| W69         | Já concluído na Wave 2 — não repetido nesta wave                                                                                                                                                                                                                              | —                |
| W71         | `canonical-probes.yml`: issue automática em falha/recuperação com label `canonical-probes` dedicado + resumo estruturado em `$GITHUB_STEP_SUMMARY`, sem dados de linha (PII)                                                                                                  | commit 61cf67d18 |
| W75/W76     | `canonical-edge-functions.yml`: deploy incremental com `dry-run` em PR (só `deno check` + diff de inventário) + smoke pós-deploy com instrução de rollback (redeploy do SHA anterior)                                                                                         | commit 4fba36673 |

**Validado nesta wave:** `workflows-contract.test.mjs` 13/13 (Parte 1 desta sessão de consolidação, 15/10); `audit-required-checks.mjs` 10/10 required checks com job correspondente; `audit-canonical-project.mjs` 100% ok; `actionlint -color .github/workflows/*.yml` limpo (exit 0); os 13 arquivos de `.github/workflows/*.yml` parseiam sem erro via `js-yaml`. `CODEOWNERS` confirmado sem `*` — só caminhos sensíveis exigem code owner (W19 resolvido).

**W58 — atualizado:** a decisão "Alvo E2E = projeto canônico com usuários sintéticos" (ver tabela de decisões abaixo) deixou de ser uma decisão pendente de infraestrutura — nesta sessão o seed de empresa/colaboradores/folha **foi de fato aplicado ao vivo** no canônico (W59/W60), com os usuários E2E já existentes (confirmado na Sessão 8) e o dono confirmando que os dados são mock/fake para validação de design, não PII real.

**W50 — desbloqueado, aguardando decisão do dono:** o bloqueio registrado na Wave 3 ("auto-merge do Dependabot só depois do CODEOWNERS estreito") não se aplica mais — `.github/CODEOWNERS` não tem `* @adm01-debug`, só os caminhos sensíveis listados em W14 exigem code owner. Tecnicamente W50 está desbloqueado. **Habilitar `allow_auto_merge` continua sendo uma decisão 💰 do dono** — não foi ativado nesta sessão.

## Itens avaliados e conscientemente adiados (não é "não fiz", é "não é seguro fazer agora")

> Atualizado pós-Wave 6: W59/W60, W47, W67, W68, W70, W71, W75 e W76 (linha combinada original) foram implementados
> nesta wave e saíram desta lista — ver tabelas da Wave 6 acima. Só W73 (do bloco original) continua adiado.

| Código             | Por que continua adiado                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W18                | Renomear os checks (ex. `ci / typecheck`) precisa ser coordenado com a atualização do ruleset (`update_ruleset`) — risco de self-lock (toda PR futura trava se o nome do check e o ruleset ficarem fora de sincronia mesmo que por minutos) para um ganho P3 (cosmético, já mitigado pelo guard do W17 que compara baseline↔ruleset vivo). Reavaliar quando houver uma janela dedicada só para isso.                                      |
| W73                | Reconciliação completa do ledger de produção com o repositório — "operação de produção" de alto risco (ver `infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md`); precisa de uma sessão dedicada com plano de rollback testado, não de um fix incremental dentro de uma wave de consolidação. W67/W68/W70 (lista derivada do ledger + apply via artifact) reduzem o risco de _novo_ drift, mas não resolvem o drift histórico já existente. |
| W85                | `secret_scanning_non_provider_patterns` + `validity_checks` exigem GHAS — não disponível no plano atual (repositório público free). Bloqueado por custo, não por falta de implementação.                                                                                                                                                                                                                                                  |
| W36 (parte ci.yml) | Remover `--no-lock` de `ci.yml` exige um `deno.lock` que cubra `supabase/functions/**` de verdade — o lock atual (222 linhas) NÃO cobre as dezenas de imports `esm.sh` vistos no log real do CI (pdf-lib, múltiplas versões de auth-js/storage-js). Sem Deno local para regenerar o lock corretamente, remover `--no-lock` quebraria o type-check imediatamente.                                                                          |

## Score Atual: 8.5/10 → revisão após Wave 6 (PR #238, squash `56a24a104`)

**Justificativa:** a lista "o que falta" das revisões anteriores estava desatualizada — W15, W25 e W23/W24 já
tinham sido resolvidos nas Waves 4/5 mas continuavam listados como pendentes. Revisando contra o estado real: dos
itens P0/P1 do plano original que dependiam de trabalho autônomo (não gated por dinheiro ou por decisão do dono),
só resta **W73** genuinamente pendente — e ele é, por desenho, uma operação de produção de alto risco que o próprio
plano marca para sessão dedicada, não um item esquecido. W18 é P3 cosmético e deliberadamente adiado pelo risco de
self-lock do ruleset. W85 está bloqueado por um gate de custo (GHAS, plano pago) fora do controle da equipe. W50
está tecnicamente desbloqueado mas aguarda uma decisão de negócio explícita do dono antes de qualquer ativação. Com
o Bloco G canônico (W67/W68/W70/W71/W75/W76) e o W47/W58/W59/W60 fechados nesta wave, a superfície autônoma do
plano está praticamente esgotada — por isso o salto de 6.5 → 8.5, reservando o 1.5 restante para W73 (risco real de
produção) e para a cauda de itens P2/P3 de baixa severidade (ver `CLAUDE.md` → Gaps Conhecidos).

**O que falta para 10/10:**

- **P0, alto risco de produção (precisa sessão dedicada):** W73 — reconciliação completa do ledger de migrações do
  canônico, seguindo `infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md` com plano de rollback testado.
- **P3, cosmético, deliberadamente adiado:** W18 — renomear os checks para identificadores ASCII estáveis (risco de
  self-lock do ruleset, mitigado pelo guard W17).
- **Bloqueado por custo (fora do controle da equipe):** W85 — `secret_scanning_non_provider_patterns` +
  `validity_checks` exigem GHAS (plano pago).
- **Aguardando decisão de negócio do dono (não é mais bloqueio técnico):** W50 — auto-merge do Dependabot;
  tecnicamente desbloqueado desde que o CODEOWNERS estreito (W19) foi confirmado, só falta o OK explícito do dono
  para `allow_auto_merge=true`.
- **P2/P3 residual, baixa severidade:** W36 (parte `ci.yml` — `--no-lock` no `deno test`, bloqueado por
  `deno.lock` incompleto), ~99 alertas CodeQL `js/unused-local-variable` restantes (ruído, sem risco), eventuais
  avisos de `noUnusedLocals` no build.

**Conquistado (Waves 0+1+2+3+4+5+6):**

- W01 bun.lock, W02 lockfile gate, W09 dedup, W10 docs, W12 ruleset API,
  W13 classic prot removida, W14 0 aprovações + code owner, W15 db-integrity fail-closed,
  W17 live audit, W19 CODEOWNERS estreito, W23/W24 role ci_auditor + REVOKE PUBLIC SECDEF,
  W25 SUPABASE_DB_URL fora do repo, W30 canonical env var,
  W31 apps inventory, W33 SHA pinning policy, W34 actions allowlist,
  W35 SHA comments, W37 deno-version, W38 node-version-file,
  W40 lhci devDep, W41 pg-client pin, W42 dependabot limits, W43 build provenance,
  W44 OSSF Scorecard, W45 paths-filter + npm cache, W47 sharding Postgres (3 shards),
  W49 concurrency SHA, W51 STEP_SUMMARY, W53 ratchet, W54 edge contract,
  W58 alvo E2E decidido e aplicado, W59/W60 seed/cleanup E2E ao vivo,
  W61 dispatch e2e, W64 post-deploy-smoke, W65 timeout,
  W67/W68/W70 canonical-migrations (ledger dinâmico + artifact + statements reais),
  W69 ledger dinâmico+sidecars, W71 canonical-probes issue automática,
  W75/W76 canonical-edge-functions (deploy incremental + smoke + rollback),
  W77 concurrency, W79 runbook, W81 security-extended, W82 CodeQL unused,
  W83 audit gate, W84 dependency-review, W86 actionlint fix, W87 bundle audit,
  W88 CodeQL schedule, W94 docs, W95 comment, W96 label, W97 contracts,
  W98 lockfile parity
