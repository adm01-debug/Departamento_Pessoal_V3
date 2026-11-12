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

> Última execução automática: 2026-11-11 (workflows-report.yml)

# Relatório de Workflows

| Workflow | Median (min) | P95 (min) | Runs |
|----------|-------------|-----------|------|
| Automação local | 0 | 15 | 43 |
| Branch Hygiene Audit | — | — | 0 |
| Canonical Supabase — Edge Functions | 3 | 60 | 41 |
| Canonical database — scoped migrations | 2 | 7294 | 35 |
| Canonical database — read-only security probes | 34155 ⚠️ | 40415 | 13 |
| Canonical database — read-only SQL diagnostic | 6983 ⚠️ | 7123 | 36 |
| Continuous Integration & Delivery | 6 | 39 | 44 |
| Contexto para agentes de IA (10 min) | 9 | 33 | 36 |
| DB Migration Tests (PLANO_100) | 0 | 7 | 34 |
| Manual & Preview Deploy | 1 | 15 | 50 |
| E2E Tests (Playwright) | 1 | 11 | 49 |
| Gitleaks | 0 | 15 | 49 |
| Environment Healthcheck | 0 | 4 | 50 |
| Inventário do estado real (semanal) | 3 | 3 | 2 |
| .github/workflows/main.yml | 0 | 0 | 1 |
| Notifica falha na main | 11 | 11 | 2 |
| OSSF Scorecard | 1 | 1 | 4 |
| Post-deploy smoke | 1 | 16 | 13 |
| Ruleset sync | 0 | 0 | 7 |
| Security Scan & Code Quality | 3 | 20 | 46 |
| Settings Guard | 0 | 0 | 1 |
| Temp Prettier Dump | 0 | 0 | 4 |
| Workflow lint (actionlint) | 1 | 24 | 46 |
| Workflows report | 1 | 1 | 4 |
| Copilot | 3 | 9 | 15 |
| Copilot cloud agent | 2 | 2 | 1 |
| Dependabot Updates | 2 | 6 | 50 |
| Dependency Graph | 1 | 1 | 1 |

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
