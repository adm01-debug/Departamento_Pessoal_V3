# Revisão da Implementação — Plano 100 Workflows

**Data:** 15/10/2026
**Wave:** 0 (PR #231, merged 14/10) + Wave 1 (concluída) + Wave 2 (15/10) + Wave 3 (15/10)
**Branch:** `claude/happy-cori-3z9h7f`
**Score estimado:** 6.5/10 (era 5.5/10 pós Wave 2)

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

| Código | Decisão                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| W03 ✅ | **npm único.** bun.lock removido; `npm ci` em CI/E2E/deploy/Docker; gate `lockfile-single` em security-config             |
| W14 🟡 | **0 aprovações + code owner em caminhos sensíveis.** Ruleset aplicado; CODEOWNERS estreito pendente de liberação do owner |

**W03 — evidência:** `package-lock.json` estava sem `@lhci/cli` e ~260 dependências transitivas (só no `bun.lock`) — drift D1 ativo. Regenerado; `npm ci` limpo (966 pacotes); typecheck, lint:ci, build e bundle budget verdes. Dockerfiles corrigidos de `node:26` para `node:22` (alinhado a `engines` + `engine-strict`) e passaram a usar o lockfile. Pós-merge: remover `oven-sh/*` da allowlist de actions (W34) — não é mais usado.

**W14 — evidência:** com 1 aprovação obrigatória, stale-dismiss e proibição de auto-aprovação, todo PR (agentes, Dependabot, owner) dependia do bypass do owner. Ruleset 21934736 aplicado via API: `required_approving_review_count: 0`, `require_code_owner_review: true`. Mantidos: conversas resolvidas, linear history, squash/rebase, force-push/deleção bloqueados. **Pendente:** o CODEOWNERS atual tem `* @adm01-debug`, então o efeito ainda é aprovação do owner em todo PR (igual a antes). A versão estreita (sem `*`; owner só em `.github/`, `infra/`, `supabase/migrations/`, `supabase/config.toml`, `external-db-bridge/`, `functions/_shared/`, Dockerfiles, `docker-compose.prod.yml`, `nginx.conf`, `vercel.json`, `.npmrc`) foi preparada, mas o commit foi barrado pela política de segurança do agente e aguarda o owner commitá-la ou liberar a ação.

**Demais decisões (critério: qualidade + velocidade + custo zero):**

| Código | Decisão                                                                                                                                                                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W25 🟡 | `db-integrity` (required) virou estático, sem segredo; auditorias reais em `db-integrity-live` (main/dispatch, `environment: production`). Os gates leem o catálogo de produção, que PR não altera. **Owner:** copiar `SUPABASE_DB_URL` para o environment Production e apagar o secret do repositório |
| W26 ✅ | Sem revisor obrigatório no environment: travaria os probes agendados. A branch policy do environment já restringe quem recebe o segredo                                                                                                                                                                |
| W21 ✅ | **Manter público.** Privado perde Actions ilimitado, CodeQL, dependency-review e secret scanning gratuitos                                                                                                                                                                                             |
| W32 ✅ | Coberto pelo W14: code owner obrigatório nos caminhos sensíveis vale para qualquer autor, inclusive agentes                                                                                                                                                                                            |
| W50 ⏸  | Auto-merge do Dependabot só depois do CODEOWNERS estreito (W14); hoje todo PR exige o owner, então o auto-merge não teria efeito                                                                                                                                                                       |
| W58 ✅ | Alvo E2E = projeto canônico com usuários sintéticos (custo zero); suíte de PR é pública e sem credenciais. Depende de criar os usuários E2E (ação manual já listada)                                                                                                                                   |
| W63 ✅ | Não contratar Mailosaur. `reset-password-callback.spec.ts` já é pulada sem os secrets; nenhuma mudança                                                                                                                                                                                                 |
| W85 ✅ | Não contratar GHAS. Encerrado                                                                                                                                                                                                                                                                          |
| W93 ✅ | Não construir N8N/WhatsApp. O healthcheck já abre issue, o que gera notificação do GitHub                                                                                                                                                                                                              |

## Score Atual: 6.5/10

**O que falta para 10/10 (autônomo):**

- P0: W15 (db-integrity fail-closed), W18 (check identifiers)
- P0 PII: W25 — owner move SUPABASE_DB_URL para o environment Production (código pronto)
- Supply chain: W23→W24 (role ci_auditor DDL)
- CI cost: W45→W47 (sharding Postgres)
- Canonical: W67→W68→W70→W71→W73→W75→W76
- E2E bloqueado por decisão do owner (W58)
- W85 bloqueado por GHAS (plano pago)

**Conquistado (Waves 0+1+2+3):**

- W01 bun.lock, W02 lockfile gate, W09 dedup, W10 docs, W12 ruleset API,
  W13 classic prot removida, W17 live audit, W30 canonical env var,
  W31 apps inventory, W33 SHA pinning policy, W34 actions allowlist,
  W35 SHA comments, W36 --no-lock, W38 node-version-file,
  W40 lhci devDep, W41 pg-client pin, W42 dependabot limits, W45 npm cache,
  W49 concurrency SHA, W51 STEP_SUMMARY, W53 ratchet, W54 edge contract,
  W61 dispatch e2e, W65 timeout, W69 ledger dinâmico+sidecars, W77 concurrency,
  W79 runbook, W81 security-extended, W82 CodeQL unused, W83 audit gate,
  W84 dependency-review, W86 actionlint fix, W87 bundle audit, W88 CodeQL schedule,
  W94 docs, W95 comment, W96 label, W97 contracts, W98 lockfile parity
