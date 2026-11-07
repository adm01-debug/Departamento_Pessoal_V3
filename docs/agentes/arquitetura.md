# Arquitetura, CI/CD e governança — referência para agentes

> Extraído do antigo `CLAUDE.md` (estado documentado em 19/10/2026) em 07/11/2026. Regras operacionais
> vivem em `AGENTS.md`; este arquivo é referência. Para o estado real (rotas, banco, edges) use o contexto
> gerado (`docs/contexto/` na branch `contexto`, `inventario/estado/`) — se divergir, o gerado vence.

## Stack

| Camada    | Tecnologia                                  | Versão |
| --------- | ------------------------------------------- | ------ |
| Runtime   | Node.js (Docker)                            | 22 LTS |
| Linguagem | TypeScript (strict)                         | 6.0.3  |
| Framework | React                                       | 19.2.8 |
| Build     | Vite                                        | 8.1.4  |
| Pacotes   | npm (único — `package-lock.json`, W03)      | 10.x   |
| Testes    | Vitest                                      | 4.1.10 |
| E2E       | Playwright                                  | 1.61.1 |
| Estilos   | Tailwind CSS                                | 4.3.3  |
| Banco     | Supabase (self-hosted) + External DB Bridge |        |

Projeto Supabase canônico: `frjbfeamybqsejlvmqbl` (`supabase/config.toml`). `verify_jwt` é deny-by-default:
toda função não listada no `config.toml` exige JWT; só endpoints deliberadamente públicos ficam com
`verify_jwt = false`, cada um com justificativa no próprio arquivo.

## Estrutura de pastas

```
/
├── src/                          # React + TS: components/, hooks/, lib/, pages/, services/, types/
├── supabase/
│   ├── functions/                # Edge Functions (Deno)
│   │   ├── external-db-bridge/   # Gateway principal (POST-only)
│   │   ├── calcular-folha/ calcular-ferias/ calcular-rescisao/ ...
│   │   └── _shared/              # Código compartilhado (authz, csrf, idempotency, inss, irrf, logger...)
│   └── migrations/               # Migrações SQL
├── infra/
│   ├── runbooks/                 # Operação: MIGRATIONS, CANONICAL_WORKFLOWS, BRIDGE_PERFORMANCE,
│   │                             #   ROTACAO_SEGREDOS, ROLLBACK_SCHEMA, BREAK_GLASS, VERCEL_CONFIG...
│   └── github/                   # ruleset-main.json, action-pins.json, labels.json, apps.md
├── .github/workflows/            # GitHub Actions (ver tabela abaixo)
├── scripts/                      # Build/audit, inventario/, ai-context/, regras_negocio/, tests/, ci/
├── inventario/estado/            # banco.json, rotas.json, edges.json (gerados)
├── docs/                         # Documentação externa (histórico; AGENTS.md vence)
├── e2e/                          # Playwright
└── public/                       # Assets estáticos
```

## Workflows (`.github/workflows/`)

| Workflow                          | Gatilho                                 | Ações                                                                                                   |
| --------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **ci.yml**                        | push/PR/workflow_dispatch               | typecheck, lint, testes, edge-functions, security-config, migrations P0, db-integrity (+live), npm audit, dependency-review, Lighthouse |
| **deploy.yml**                    | PR / workflow_dispatch                  | Build + bundle budget (`scripts/.bundle-budget.json`); deploy real é pela integração Git da Vercel      |
| **security.yml**                  | push/PR/schedule/dispatch               | CodeQL + npm audit de produção + OSSF Scorecard                                                          |
| **e2e.yml**                       | push/PR/dispatch                        | Playwright público (PR) + autenticado (main e dispatch)                                                 |
| **healthcheck.yml**               | schedule (*/6h)/dispatch                | Healthcheck de produção + abre issue se falhar                                                          |
| **post-deploy-smoke.yml**         | deployment_status                       | `scripts/healthcheck.sh` contra o deploy de produção                                                    |
| **canonical-probes.yml**          | schedule/workflow_call/dispatch         | Probes RV-01–04 no canônico; issue automática em falha/recuperação                                      |
| **canonical-migrations.yml**      | workflow_dispatch                       | Migrations no canônico: `validate` (BEGIN…ROLLBACK) e `apply` (exige hash validado + `confirm_project_ref`); ledger dinâmico + sidecars `.verify.sql` |
| **canonical-edge-functions.yml**  | push (functions, config.toml)/dispatch  | Deploy incremental das Edge Functions no canônico (dry-run)                                             |
| **canonical-sql-diag.yml**        | workflow_dispatch                       | Diagnóstico SQL read-only no canônico                                                                   |
| **ruleset-sync.yml**              | schedule/dispatch                       | Compara o ruleset vivo com `infra/github/ruleset-main.json`                                             |
| **workflow-lint.yml**             | PR (.github/**)/dispatch                | actionlint + shellcheck + zizmor                                                                        |
| **contexto.yml**                  | push main/schedule (10 min)/dispatch    | Contexto para agentes → branch `contexto` (codigo/ + supabase/ + regras/ + índice)                      |
| **inventario-estado-semanal.yml** | schedule (seg 10:23 UTC)/dispatch       | `inventario/estado/*.json` → PR automático com auto-merge                                               |
| gitleaks.yml, ossf-scorecard.yml, workflows-report.yml | —                  | Segredos vazados, scorecard, relatório semanal de workflows                                             |

## Governança do `main`

- Regras de merge: squash-only, delete branch on merge, allow update branch.
- Ruleset `main` (ID 21934736): 10 required status checks, 0 aprovações; revisão de code owner só nos caminhos
  de `.github/CODEOWNERS` (`.github/`, `infra/`, `supabase/migrations/`, `supabase/config.toml`,
  `external-db-bridge/`, `_shared/`, Dockerfiles, `nginx.conf`, `vercel.json`, `.npmrc`). Baseline em
  `infra/github/ruleset-main.json`, validado por `ruleset-sync`.
- Supply chain: `sha_pinning_required`, allowlist de Actions (github_owned + verified + `denoland/*`,
  `supabase/*`, `ossf/*`, `dorny/*`, `zizmorcore/*`), pins offline em `infra/github/action-pins.json`.
- Vars públicas (`VITE_SUPABASE_URL`, anon key) ficam em `vars.*`, não em secrets. `SUPABASE_DB_URL` está no
  environment Production. CI de auditoria usa `SUPABASE_DB_URL_READONLY` (role `ci_auditor`, só catálogo).
- `workflows-report.yml`: PRs criadas com `GITHUB_TOKEN` não disparam `pull_request` (limitação do GitHub).

## Segurança do gateway `external-db-bridge`

```
POST-only gateway
├── JWT validation (getUser()) para writes
├── CSRF fail-closed (verifyCsrf) — `if (!csrf.ok) return csrf.response ?? jsonError(403, ...)`
├── Rate limiting (30 writes/100 reads/20 anon por min) — writes retornam 503 sem SERVICE_ROLE_KEY
├── Tenant isolation (empresa_id scope)
├── TABLE_DENYLIST (27 tabelas, inclui supabase_migrations e pg_catalog sensíveis)
├── RPC_ALLOWLIST (97 RPCs — expandida a cada wave)
├── SQL injection prevention (isSafeTableName/Column/OrderColumn/FilterColumn + DANGEROUS_TOKENS)
├── trace_id validado (≤128, /^[A-Za-z0-9_:@.-]+$/)
├── .single() query support · Payload cap (256KB)
└── Telemetry batch + error tracking com severidade (SLOW/VERY_SLOW)
```

Código: `supabase/functions/external-db-bridge/index.ts` + `_shared/validation.ts`. Runbook de desempenho:
`infra/runbooks/BRIDGE_PERFORMANCE.md`.

## Headers de produção

CSP, HSTS, COOP/CORP, Permissions-Policy e `X-Robots-Tag: noindex` em `vercel.json`; equivalente para Docker
em `nginx.conf`. Mudanças nesses arquivos exigem code owner.

## Comandos úteis

```bash
npm run dev · npm run build · npm run ci:verify · npm run test · npm run test:e2e
npx tsc --noEmit                      # typecheck (config raiz = o que o CI roda)
npm ci · npm outdated · npm ls
git fetch --prune · git branch -d <branch>
docker build -t dp-v2 . · docker compose up
```
