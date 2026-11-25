# Workflows — Status de Duração

> Atualizado em: 15/10/2026 (Sessão 9, W92)
> Metas: PR docs-only ≤ 4 min | PR de código ≤ 12 min | Push main ≤ 15 min

## Script de relatório

O script `scripts/report-workflows.mjs` está funcional e gera uma tabela com
mediana/P95 de duração e taxa de falha dos últimos 50 runs por workflow.

Para gerar o relatório ao vivo:

```bash
GITHUB_TOKEN=<seu-token> node scripts/report-workflows.mjs
```

Sem token: modo offline (mostra apenas as metas, sem dados reais).

### Automação (W92)

`.github/workflows/workflows-report.yml` roda o script semanalmente
(quarta-feira, cron) e também sob `workflow_dispatch`. A saída é injetada
entre os marcadores abaixo via `scripts/update-workflows-status.mjs`; se o
conteúdo mudar (`git diff --quiet`), o workflow cria uma branch dedicada,
comita e abre um PR com `gh pr create` — nunca abre PR vazio.

<!-- REPORT:START -->

> Última execução automática: 2026-11-25 (workflows-report.yml)

# Relatório de Workflows

| Workflow | Median (min) | P95 (min) | Runs |
|----------|-------------|-----------|------|
| Automação local | 0 | 1 | 48 |
| Branch Hygiene Audit | 4 | 4 | 3 |
| Canonical Supabase — Edge Functions | 2 | 6 | 48 |
| Canonical database — scoped migrations | 1 | 1 | 48 |
| Canonical database — read-only security probes | 353 ⚠️ | 34284 | 25 |
| Canonical database — read-only SQL diagnostic | 1 | 1 | 50 |
| Continuous Integration & Delivery | 9 | 11 | 44 |
| Contexto para agentes de IA (10 min) | 1 | 5 | 50 |
| DB Migration Tests (PLANO_100) | 0 | 7 | 34 |
| Manual & Preview Deploy | 1 | 3 | 49 |
| E2E Tests (Playwright) | 2 | 8 | 48 |
| Gitleaks | 1 | 1 | 48 |
| Environment Healthcheck | 0 | 23 | 50 |
| Inventário do estado real (semanal) | 2 | 3 | 5 |
| .github/workflows/main.yml | 0 | 0 | 3 |
| Notifica falha na main | — | — | 0 |
| OSSF Scorecard | 1 | 1 | 6 |
| Post-deploy smoke | 1 | 3 | 8 |
| Ruleset sync | 0 | 0 | 9 |
| Security Scan & Code Quality | 4 | 5 | 46 |
| Settings Guard | 0 | 2 | 15 |
| Temp Prettier Dump | 0 | 2 | 6 |
| Workflow lint (actionlint) | 0 | 2 | 50 |
| Workflows report | 1 | 16 | 6 |
| Copilot | 5 | 15 | 20 |
| Copilot cloud agent | 2 | 2 | 2 |
| Dependabot Updates | 3 | 9 | 50 |
| Dependency Graph | 1 | 1 | 4 |

<!-- REPORT:END -->

## Workflows registrados (13 no total)

| Workflow                 | Arquivo                      | Descrição                                    |
| ------------------------ | ---------------------------- | -------------------------------------------- |
| CI                       | ci.yml                       | 12 jobs: typecheck, lint, testes, edge, etc. |
| Deploy                   | deploy.yml                   | Build + bundle budget (Vercel)               |
| Security                 | security.yml                 | CodeQL + npm audit produção                  |
| E2E                      | e2e.yml                      | Playwright público (PR) + autenticado (main) |
| Healthcheck              | healthcheck.yml              | Healthcheck a cada 6h                        |
| Post-deploy smoke        | post-deploy-smoke.yml        | healthcheck.sh após deploy produção          |
| Canonical Probes         | canonical-probes.yml         | Probes RV-01–04 no canônico (diário)         |
| Canonical Migrations     | canonical-migrations.yml     | Migrations no canônico (validate/apply)      |
| Canonical Edge Functions | canonical-edge-functions.yml | Deploy Edge Functions no canônico            |
| Canonical SQL Diag       | canonical-sql-diag.yml       | Diagnóstico SQL read-only no canônico        |
| Ruleset Sync             | ruleset-sync.yml             | Compara ruleset vivo × baseline (semanal)    |
| Workflow Lint            | workflow-lint.yml            | actionlint + shellcheck nos workflows        |
| OSSF Scorecard           | ossf-scorecard.yml           | Supply-chain score (semanal)                 |
| Workflows Report         | workflows-report.yml         | W92 — relatório de duração/P95 (semanal)     |

## Artifacts — Limpeza (W56)

Executada em 15/10/2026. Total encontrado: 478 artifacts.
Artifacts anteriores a 01/10/2026: 134.
Deletados (limite 20): 20 mais antigos (criados entre 08/08/2026 e 25/08/2026).

Restam ~114 artifacts anteriores a 01/10/2026 a limpar em execuções futuras.

## Próximos passos

- Executar relatório ao vivo com GITHUB_TOKEN para popular tabela de duração/P95
- Continuar limpeza de artifacts antigos (restam ~114 anteriores a 01/10/2026)
