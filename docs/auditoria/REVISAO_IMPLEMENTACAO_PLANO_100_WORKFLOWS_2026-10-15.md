# Revisão da Implementação — Plano 100 Workflows

**Data:** 15/10/2026
**Wave:** 0 (PR #231, merged 14/10) + Wave 1 (em andamento)
**Branch:** `claude/happy-cori-3z9h7f`
**Score estimado:** 4.5/10 (era 3/10)

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

## Decisões Pendentes do Owner

| Código | Decisão necessária                                               |
| ------ | ---------------------------------------------------------------- |
| W03 💰 | npm vs Bun — gerenciador único                                   |
| W14 💰 | Modelo de aprovação (required_approving_review_count)            |
| W21 💰 | Tornar repositório privado?                                      |
| W32 💰 | Aprovação humana obrigatória para PRs de agentes (Devin, Claude) |
| W50 💰 | Auto-merge Dependabot patch/minor                                |
| W58 💰 | Isolamento do alvo E2E (branch Supabase vs staging vs produção)  |
| W63 💰 | Mailosaur (contratar ou remover specs de reset de senha)         |
| W93 💰 | Notificação N8N/WhatsApp para main vermelha                      |

## Score Atual: 4.5/10

**O que falta para 10/10:**

- P0: W11→W12→W13 (ruleset update via API), W15 (db-integrity fail-closed), W18 (check identifiers)
- P0 PII: W27→W28 (canonical-sql-diag PII protection), W25→W26 (secrets em environment)
- Supply chain: W23→W24 (role ci_auditor), W33→W34 (SHA pinning policy)
- CI cost: W45→W47 (sharding Postgres), W52→W87 (build.yml)
- E2E: W58 (decisão) → W59→W60→W62
- Canonical: W67→W68→W69→W70→W71→W73→W75→W76
