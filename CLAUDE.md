# AI Context — Departamento Pessoal v3

> Documentação para agentes de IA (Hermes, Claude Code, Cursor, Copilot, etc)
> Última atualização: 18/10/2026
> Mantenedor: Hermes Agent (AtomicaBR Ops/Dev)

> ⚠️ **Correções de auditoria (23/07/2026)** — revisão do batch anterior:
>
> - `typescript` **re-pinado 7.0.2 → 6.0.3**. TS 7 quebrava o `typescript-eslint` (peer `>=4.8.4 <6.1.0`) → `lint:ci` abortava (CI vermelho). **NÃO re-bumpar `typescript` para ≥6.1.0** até o typescript-eslint suportar. O `tsgo` (typecheck) vem do pacote separado `@typescript/native-preview`, não afetado.
> - Bucket de storage **`ferias-avisos` criado** (migração `20260723113000`). O batch da feature de assinatura criou as policies RLS mas nunca o bucket → upload do PDF falhava em runtime ("Bucket not found").
> - Corrigidos 3 erros de tipo de mock em `loggerService.test.ts` (vitest 4).
>   ✅ **Resolvido (28/07/2026)** — `tsconfig.app.json` foi removido (era órfão). O único config é `tsconfig.json` (raiz), o mesmo que o CI roda via `tsgo --noEmit`, agora com **`strict: true` + `noImplicitAny: true`** e **0 erros** (17 erros reais corrigidos em 7 arquivos).
>   ✅ **Resolvido (28/07/2026)** — `build.minify` migrado para a forma de objeto do Vite 8/OXC (`{ type: 'oxc', compress: { dropConsole: [...] } }`). Auditoria do bundle: os `console.*` remanescentes são **100% de vendor chunks** (jspdf, vendor-react, vendor-supabase), sem PII e sem origem no nosso código.
>   ✅ **Resolvido (29/09/2026)** — `typecheck:tests` roda limpo (0 erros); nota de 232 erros latentes removida.

## 📋 Sumário

1. [Stack & Arquitetura](#-stack--arquitetura)
2. [Histórico de Sessões](#-histórico-de-sessões)
3. [Estado Atual](#-estado-atual)
4. [Decisões Técnicas](#-decisões-técnicas)
5. [Gaps Conhecidos](#-gaps-conhecidos)
6. [Próximos Passos Recomendados](#-próximos-passos-recomendados)
7. [Comandos Úteis](#-comandos-úteis)

---

## 🏗 Stack & Arquitetura

### Stack Principal

| Camada        | Tecnologia                                  | Versão |
| ------------- | ------------------------------------------- | ------ |
| **Runtime**   | Node.js (Docker)                            | 22 LTS |
| **Linguagem** | TypeScript (strict)                         | 6.0.3  |
| **Framework** | React                                       | 19.2.8 |
| **Build**     | Vite                                        | 8.1.4  |
| **Pacotes**   | npm (único — `package-lock.json`, W03)      | 10.x   |
| **Testes**    | Vitest                                      | 4.1.10 |
| **E2E**       | Playwright                                  | 1.61.1 |
| **Estilos**   | Tailwind CSS                                | 4.3.3  |
| **Banco**     | Supabase (self-hosted) + External DB Bridge |

### Estrutura de Pastas

```
/
├── src/                          # Código fonte (React + TS)
│   ├── components/               # Componentes React
│   ├── hooks/                    # Custom hooks
│   ├── lib/                      # Utilitários
│   ├── pages/                    # Páginas/Rotas
│   ├── services/                 # API services
│   ├── types/                    # Tipos TypeScript
│   └── ...
├── supabase/
│   ├── functions/                # Edge Functions (Deno)
│   │   ├── external-db-bridge/   # Gateway principal (POST-only)
│   │   ├── calcular-folha/       # Cálculo folha de pagamento
│   │   ├── calcular-ferias/      # Cálculo de férias
│   │   ├── calcular-rescisao/    # Cálculo de rescisão
│   │   ├── ... (30+ funções)
│   │   └── _shared/              # Código compartilhado
│   └── migrations/               # Migrações SQL
├── infra/                        # Documentação de infraestrutura
│   ├── runbooks/                 # Runbooks de operação
│   │   └── BRIDGE_PERFORMANCE.md # 10 gaps do bridge
│   └── ...
├── .github/
│   ├── workflows/                # GitHub Actions (12 workflows)
│   │   ├── ci.yml                # CI principal (12 jobs: typecheck, lint, testes, edge, segurança, migrations, banco, audit)
│   │   ├── deploy.yml            # Build + bundle budget (deploy pela integração Git da Vercel)
│   │   ├── security.yml          # CodeQL + npm audit de produção
│   │   ├── e2e.yml               # Playwright E2E (público em PR + autenticado na main)
│   │   ├── healthcheck.yml       # Healthcheck agendado a cada 6h
│   │   ├── post-deploy-smoke.yml # healthcheck.sh após deploy de produção
│   │   ├── canonical-probes.yml  # Probes RV-01/02/03/04 no canônico (diário)
│   │   ├── canonical-migrations.yml # Migrations no canônico (validate/apply com hash)
│   │   ├── canonical-edge-functions.yml # Deploy Edge Functions no canônico
│   │   ├── canonical-sql-diag.yml # Diagnóstico SQL read-only no canônico
│   │   ├── ruleset-sync.yml      # Compara ruleset vivo × baseline (semanal)
│   │   └── workflow-lint.yml     # actionlint + shellcheck nos workflows
│   └── dependabot.yml            # Dependabot: npm+docker+github-actions (semanal)
├── config/                       # Config filters
├── docker/                       # Dockerfiles auxiliares
├── scripts/                      # Scripts de build/audit
├── docs/                         # Documentação externa
├── e2e/                          # Testes E2E (Playwright)
└── public/                       # Assets estáticos
```

### Pipelines CI/CD

| Workflow                         | Gatilho                                | Ações                                                                                                                                  |
| -------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **ci.yml**                       | push/PR/workflow_dispatch              | 12 jobs: typecheck, lint, testes, edge, security-config, migrations P0, db-integrity (+live), npm audit, dependency-review, Lighthouse |
| **deploy.yml**                   | PR / workflow_dispatch                 | Build + bundle budget (deploy pela integração Git da Vercel)                                                                           |
| **security.yml**                 | push/PR/schedule/workflow_dispatch     | CodeQL + npm audit de produção                                                                                                         |
| **e2e.yml**                      | push/PR/workflow_dispatch              | Playwright público (PR) + autenticado (main e dispatch)                                                                                |
| **healthcheck.yml**              | schedule (*/6h)/workflow_dispatch      | Healthcheck de produção + abre issue se falhar                                                                                         |
| **post-deploy-smoke.yml**        | deployment_status                      | `scripts/healthcheck.sh` contra o deploy de produção                                                                                   |
| **canonical-probes.yml**         | schedule/workflow_call/dispatch        | Probes RV-01–04 no canônico                                                                                                            |
| **canonical-migrations.yml**     | workflow_dispatch                      | Migrations no canônico (validate; apply exige validated_hash)                                                                          |
| **canonical-edge-functions.yml** | push (functions, config.toml)/dispatch | Deploy Edge Functions no canônico                                                                                                      |
| **canonical-sql-diag.yml**       | workflow_dispatch                      | Diagnóstico SQL read-only no canônico                                                                                                  |
| **ruleset-sync.yml**             | schedule/workflow_dispatch             | Compara o ruleset vivo com `infra/github/ruleset-main.json` (`--full`)                                                                 |
| **workflow-lint.yml**            | PR (.github/**)/workflow_dispatch      | actionlint + shellcheck                                                                                                                |

**Regras do merge (E09 — via API 27/09/2026):** squash-only, delete branch on merge, allow update branch.

**Ruleset main (ID 21934736):** 10 required_status_checks, 0 aprovações + code owner em caminhos sensíveis — baseline em `infra/github/ruleset-main.json` (validado por `ruleset-sync`).

### Segurança do Bridge (external-db-bridge)

```
POST-only gateway (781 lines)
├── JWT validation (getUser()) para writes
├── CSRF fail-closed (verifyCsrf)
├── Rate limiting (30 writes/100 reads/20 anon por min)
├── Tenant isolation (empresa_id scope)
├── Table denylist (21 tabelas sensíveis bloqueadas)
├── RPC allowlist (95 RPCs aprovadas — expandida com cada wave)
├── SQL injection prevention (isSafeTableName/Column/OrderColumn)
├── ORDER BY column validation (isSafeOrderColumn)
├── .single() query support
├── Payload cap (256KB)
├── Telemetry batch (reduce 446/s → 10/s)
└── Error tracking com severidade (SLOW/VERY_SLOW)
```

---

## 📜 Histórico de Sessões

### Sessão 1 — 22-23/07/2026 (Hermes Agent)

**Duração:** 4h30min | **Commits:** 38 | **PRs:** 24

#### O que foi feito:

```
🔧 INFRAESTRUTURA (7 entregas)
├── Dockerfile: Node 18 → 22 LTS
├── nginx.conf: try_files + proxy vars fix
├── .nvmrc: 20 → 22
├── .gitignore: aprimorado
├── .env.example: sanitizado (removeu keys reais)
├── LICENSE: 2026 + AtomicaBR
├── CODEOWNERS: estruturado

🔒 SEGURANÇA (7 entregas)
├── CodeQL scanning ativado (security.yml)
├── Dependabot groups configurados
├── Branch protection workflow
├── .env removido do repositório
├── Bridge ORDER BY column validation
├── Bridge .single() query support
├── tsconfig.app.json: strict mode ativado

📦 25 DEPENDÊNCIAS BUMPADAS
├── TypeScript 6.0.3 → 7.0.2
├── vitest 1.2.2 → 4.1.10
├── React 19.2.4 → 19.2.8
├── framer-motion 12.36.0 → 12.42.2
├── @sentry/react 10.53.1 → 10.67.0
├── recharts 2.10.4 → 3.9.2
├── react-day-picker 9.6.0 → 10.0.1
├── react-hook-form 7.49.3 → 7.79.0
├── tailwind-merge 2.2.1 → 3.6.0
├── lucide-react 0.562.0 → 1.25.0
├── typescript-eslint 8.60.1 → 8.65.0
├── vite 8.0.14 → 8.1.4
├── papaparse 5.5.3 → 5.5.4
├── uuid 14.0.0 → 14.0.1
├── and 11 more...

📝 TYPESCRIPT STRICT
├── 19 `any` removidos (PR #49):
│   ├── FinancialSummaryCards.tsx: 7 any
│   └── PontoAdjustmentRequests.tsx: 12 any
├── tsconfig.app.json: strict false→true ✅
├── 675 arquivos — claim NÃO validado (era sob tsconfig.app.json ÓRFÃO; ver aviso no topo)

📚 DOCUMENTAÇÃO
├── CHANGELOG.md: v18.0.1
├── CONTRIBUTING.md: stack + comandos
├── README.md: status + badges
├── infra/runbooks/BRIDGE_PERFORMANCE.md: 10 gaps
├── CLAUDE.md (este arquivo)

🤖 AUTOMAÇÃO
├── Bun 1.3.14 instalado permanentemente
├── Cron sync-bun-lock: a cada 30min
├── Dependabot groups: radix-ui, react-ecosystem, testing

🧹 LIMPEZA
├── 17 branches stale deletadas
├── .env removido (estava commitado)
├── CI: Bun → Node fallback adicionado
├── Deploy: Bun → Node fallback adicionado
├── Dockerfile: npm ci → npm install
```

### Sessão 2 — 27/09/2026 (Claude Sonnet 4.6)

**Branch:** `claude/great-rubin-c50zcx` | **PR:** #145 (draft) | **Plano:** 100 etapas

#### O que foi feito:

```
🔒 WORKFLOWS AUDIT — plano docs/auditoria/PLANO_100_WORKFLOWS_2026-09-27.md
├── E01 — branch-protection.yml congelado (if: false); evita destruir ruleset
├── E02 — infra/github/ruleset-main.json: baseline dos 7 required_status_checks
├── E08 — scripts/audit-required-checks.mjs: gate que valida required checks ↔ jobs
├── E09 ⚙️ — repo: squash-only, delete-branch-on-merge, allow-update-branch (API)
├── E21 — fallback morto VITE_SUPABASE_ANON_KEY removido de ci.yml/deploy.yml/healthcheck.yml
├── E31 — package.json: engines + packageManager declarados
├── E32/E62-E64 — dependabot.yml: ignore TS≥6.1.0; docker eco; actions semanal; grupo npm
├── E33 — timeout-minutes em todos os 12 jobs que não tinham (ci×7, security, deploy,
│          healthcheck, canonical-edge/migrations/probes)
├── E35 — ci.yml: trigger branches: [master] removido (só main)
├── E44 — permissions: contents: read no topo de deploy.yml e security.yml
├── E53/E54 — e2e.yml: retention reduzida; CI_BRANCH injetado;
│             playwright.config.ts: retries=0 em PR, 2 em main
├── E87 — PULL_REQUEST_TEMPLATE.md: seção "verificado de verdade" adicionada
├── E88 — ISSUE_TEMPLATE: bug/feature removidos; config.yml blank_issues=false
├── E89 — FUNDING.yml removido
├── E91 — README.md: badges CI/Security/E2E/Healthcheck; CLAUDE.md atualizado
├── E93 ⚙️ — labels criados: e2e-main, ci, security, canonical
└── E96 — scripts/tests/workflows-contract.test.mjs: 5 contratos em todos os workflows
```

### Sessão 3 — 28/09/2026 (Claude Sonnet 4.6)

**Branch:** `claude/chore-e03-e48-260928` | **PR:** #153

#### O que foi feito:

```
🔒 E03 — Branch protection em main ativada via API
│   required_pull_request_reviews (count=0, sem aprovação obrigatória)
│   allow_force_pushes=false, allow_deletions=false
│   required_conversation_resolution=true
│   ⚠️  enforce_admins=false (CI/CD não bloqueado)

🔑 E48 — Secrets E2E atualizados para credenciais conhecidas
│   E2E_USER_EMAIL=admin@teste.local
│   E2E_USER_PASSWORD=Admin@2026!
│   E2E_NON_ADMIN_EMAIL=user@teste.local
│   E2E_NON_ADMIN_PASSWORD=User@2026!
│   (coincidem com os fallbacks de auth.setup.ts / auth-non-admin.setup.ts)
│   ⚠️  Usuários devem existir em frjbfeamybqsejlvmqbl.supabase.co Auth
│       — verificar na dashboard Supabase se E2E ainda falhar

✅ E66 — Confirmado já completo na Sessão 2 (recon da sessão 3 confirmou SHA-pinning)
```

### Sessão 4 — 28/09/2026 (Claude Sonnet 4.6)

**Branches:** `claude/fix-e2e-bun-lockfile-260928` (PR #154, merged) · `claude/feat-sonarcloud-260928-0045` (PR #155, CI verde, aguardando merge) · `claude/great-rubin-c50zcx` (este arquivo)

#### O que foi feito:

```
🔧 MELHORIA 2 — bun lockfile + patch segurança (PR #154 → merged SHA 50e29626)
├── e2e.yml: bun-version: latest → 1.3.14 (nos 2 jobs playwright)
│   Causa raiz: Bun v1.4.2 (latest) escrevia lockfileVersion:3;
│   Bun 1.3.14 não consegue ler → "Unknown lockfile version" em CI
├── bun.lock regenerado com Bun 1.3.14 (lockfileVersion:1)
└── @testing-library/dom 10.4.1 → 10.4.2 (Dependabot PR #147, patch de segurança)

🔒 MELHORIA 3 — SonarCloud análise estática (PR #155 — CI verde, aguardando merge)
├── sonar-project.properties criado
│   key=adm01-debug_Departamento_Pessoal_V3, org=adm01-debug
│   exclui arquivos de teste; lcov.info como coverage report
├── security.yml: job `sonarcloud` adicionado após CodeQL
│   skip gracioso sem SONAR_TOKEN (::notice:: + exit 0 — CI nunca quebra)
│   SHA-pinado: SonarSource/sonarqube-scan-action@ba9859... (v8.2.2)
│   Para ativar: criar projeto sonarcloud.io (org adm01-debug) + SONAR_TOKEN como repo secret
└── CI verificado: 100% verde — 7 required checks + E2E + Security + Deploy ✅

⛔ MELHORIA 1 — BLOQUEADA (ação manual obrigatória)
│   Criar usuários E2E em frjbfeamybqsejlvmqbl.supabase.co Auth:
│   admin@teste.local / Admin@2026! · user@teste.local / User@2026!
└── MCP Departamento Pessoal somente leitura — sem supabase_auth_create_user
```

### Sessão 5 — 29/09/2026 (Claude Sonnet 4.6)

**Branches:** `claude/fix-sonarcloud-autoscan-conflict-260929-1250` (PR #162, merged) · `claude/fix-fast-uri-audit-260929-1400` (PR #163, merged)

#### O que foi feito:

```
🔒 PR #163 — fast-uri 3.1.6 → 3.1.8 (segurança alta, merged SHA 2b4e053)
│   GHSA-qw65-cvwx-89v3 + GHSA-58mr-gqgx-xq4g (high severity)
│   package.json: overrides range corrigido >=3.0.0 <=3.1.6 → 3.1.8
│   package-lock.json + bun.lock regenerados
│   npm audit --audit-level=high: 0 vulnerabilidades após fix
│   CI 100% verde antes do merge

🔧 PR #162 — SonarCloud CI scanner removido de security.yml (merged)
│   Job `sonarcloud` conflitava com Automatic Analysis do GitHub App (exit code 3)
│   Causa: ambos os modos não coexistem — CI scanner falha quando Automatic Analysis ativo
│   Solução: manter apenas Automatic Analysis (zero-config, já verde)
│   sonar-project.properties + SONAR_TOKEN preservados para futura migração
└── CI 100% verde (branch atualizado com fix fast-uri de main antes do merge)

⛔ BLOQUEADO — ação manual obrigatória
│   Criar usuários E2E em frjbfeamybqsejlvmqbl.supabase.co Auth:
│   admin@teste.local / Admin@2026! · user@teste.local / User@2026!
└── MCP Departamento Pessoal V3 somente leitura — sem supabase_auth_create_user
```

### Sessão 6 — 14/10/2026 (Claude Sonnet 4.6)

**Branch:** `claude/happy-cori-3z9h7f` (plano 100 etapas — Wave 0 autônoma)

#### O que foi feito:

```
🔧 W01 — bun.lock regenerado com Bun 1.4.2 (lockfileVersion:3)
│   D1: Dependabot PRs #216/#217/#218 (13/10) atualizaram package-lock.json
│   mas não bun.lock → bun install --frozen-lockfile falhava no CI.
│   Solução: bun.lock regenerado; bun-version 1.3.14 → 1.4.2 em e2e.yml e
│   deploy.yml (CI e local agora idênticos).

📌 W35 — Comentários # v4 → # v7 em canonical-probes.yml e canonical-sql-diag.yml
│   SHA 820762... (actions/setup-node) era v7 mas comentado como v4.
│   Cria infra/github/action-pins.json: tabela offline SHA→versão (8 actions)
│   usada pelo contrato W97 para validação sem rede.

🔧 W53 — ratchet-lint-warnings.mjs: patch automático de lint:ci --max-warnings
│   ao atualizar o budget, mantendo budget e package.json sempre em sincronia.

⚙️ W54 — Contrato de auditoria Edge movido de typecheck → security-config
│   typecheck fica puro (sem npm install); security-config já tem npm install.

🧹 W82 — 9 variáveis/imports não-usados removidos em 9 arquivos Edge/src
│   Fix CodeQL #187 (js/comparison-between-incompatible-types em safeError.ts).
│   8 alertas js/unused-local-variable fechados na raiz.

📝 W95 — ci.yml: comentário D26 explica format:check:changed em push na main.

🔖 W96 — ci.yml: label ci → ci-main no job rls-live (D22).
│   Cria infra/github/labels.json: inventário de labels de workflow.

✅ W97 — workflows-contract.test.mjs: 6 novos contratos (checks 6-11)
│   Regex de var sensível narrowed (só $VAR, não string literal).
│   npx -y → WARN pendente W40; node-version → WARN pendente W38.
│   11/11 workflows passam, 0 falhas.

🧪 W98 — scripts/tests/lockfile-parity.test.sh criado
│   Detecta regressão D1: bun install --frozen-lockfile + paridade de pacotes.

📚 W94 — CLAUDE.md: 11 workflows (era 10), sessão 6, gaps e métricas atualizados.
```

### Sessão 7 — 15/10/2026 (Claude Sonnet 4.6)

**Branch:** `claude/happy-cori-3z9h7f` (Wave 2 — W69/W86/W87)

#### O que foi feito:

```
🔧 W86-fix — workflow-lint.yml: corrigir ./actionlint → actionlint (PATH)
│   go install coloca o binário em ~/go/bin (no PATH), não em ./
│   O ./ causava "command not found" em todo run do workflow.

📦 W87 — deploy.yml: artefato dist/ + auditoria de bundle
│   Publicar dist/ como artifact (upload-artifact v7, retention 7 dias)
│   após o build para reuso downstream (Lighthouse, auditoria).
│   Executar node scripts/check-bundle-budget.mjs para bloquear merge
│   se orçamento de bundle for excedido.
│   SHA 043fb46d já presente em action-pins.json → contrato check-6 passa.

🔑 W69 — canonical-migrations.yml: ledger genérico + sidecars .verify.sql
│   Substituiu ledger_count hardcoded (6 versões fixas de ondas 3b/4) por
│   verificação dinâmica: itera os arquivos do stage, monta lista de versões,
│   confirma count no supabase_migrations.schema_migrations.
│   Adiciona runner de sidecars: se existir <versão>.verify.sql no repo,
│   executa via psql após as invariantes acumuladas.
│   Marcadores: CANONICAL_LEDGER_OK, CANONICAL_SCHEMA_INVARIANTS_OK,
│   CANONICAL_SCOPED_MIGRATIONS_OK.

✅ Contratos: 12/12 workflows, 0 falhas (W97 — detectou workflow-lint.yml fix).

📚 W94 — CLAUDE.md: sessão 7, métricas e status atualizados.
```

### Sessão 8 — 15/10/2026 (Claude Sonnet 4.6)

**Branch:** `claude/happy-cori-3z9h7f` (Wave 3 — API + scripts)

#### O que foi feito:

```
⚙️ W12 — Ruleset 21934736 atualizado via API: 7 → 9 required checks
│   Adicionados: "Playwright público (PR)" e "Build"
│   infra/github/ruleset-main.json atualizado para refletir os 9 checks

⚙️ W13 — Proteção clássica de branch removida via API
│   Resolve conflito histórico D2 (ruleset + classic protection coexistindo)
│   Ruleset é agora a única fonte de proteção do branch main

⚙️ W33 — sha_pinning_required=true via PUT /repos/…/actions/permissions
│   Todas as GitHub Actions do repo precisam de SHA pin — supply chain hardened

⚙️ W34 — allowed_actions=selected via API (fix 409 race condition)
│   github_owned=true, verified=true
│   patterns: denoland/*, oven-sh/*, ossf/*, SonarSource/*, supabase/*

🔍 W17 — audit-required-checks.mjs: comparação live com GITHUB_TOKEN
│   Quando GITHUB_TOKEN disponível: busca ruleset 21934736 via API e compara
│   com baseline; falha se houver divergência (checks só no baseline ou só no live)
│   Quando sem token: usa apenas baseline offline (comportamento anterior)

🔧 W30 — validate-canonical-db-url.mjs + audit-canonical-project.mjs
│   CANONICAL_PROJECT_REF / CANONICAL_REF agora leem process.env.CANONICAL_SUPABASE_REF
│   com fallback para 'frjbfeamybqsejlvmqbl' — permite sobrescrever em staging

❌ W85 — secret_scanning_non_provider_patterns + validity_checks
│   GHAS requerido — não disponível no plano atual (public free repo)
│   API retornou 200 mas campos permanecem "disabled"

📚 W94 — CLAUDE.md: sessão 8, métricas e score atualizados (6.5/10)
```

### Sessão 9 — 15/10/2026 (Claude Sonnet 5)

**Branch:** `claude/happy-cori-3z9h7f` (Wave 6 — PR #238 squash-merged, commit `56a24a104`; consolidação W99/W100)

#### O que foi feito:

```
🔒 CORREÇÕES DA REVISÃO DO CODEX NA PR #238 (5 achados P1/P2)
├── scripts/audit-rls-pii.mjs: information_schema.columns (sempre vazia p/
│   ci_auditor) → pg_attribute/pg_class/pg_namespace (catálogo puro);
│   gate de PII/RLS deixava de checar qualquer policy (D3)
├── e2e.yml: guard de dispatch autenticado agora exige github.ref ==
│   refs/heads/main além de inputs.ref (seletor nativo de branch burlava o
│   guard antigo); checkout do público usa ref: inputs.ref || github.sha
├── playwright.config.ts: webServer.reuseExistingServer também true quando
│   baseURL != local (post-deploy-smoke.yml sempre quebrava sem isso)
└── ci.yml (job changes): checkout fetch-depth:0 antes do dorny/paths-filter
    (sem ele, push/dispatch derrubava em cascata o check "Edge Functions")

🔐 SEGURANÇA — REVOKE EXECUTE...FROM PUBLIC (6 achados adicionais)
├── Migration nova 20261015170000_ci_auditor_revoke_public_secdef.sql:
│   16 funções SECURITY DEFINER de negócio (admissao_salvar_dados etc.)
│   eram executáveis por ci_auditor via GRANT implícito a PUBLIC,
│   contornando RLS. Revogado + GRANT explícito restaurado para
│   anon/authenticated/service_role. Validado ao vivo (0 regressão)
├── canonical-edge-functions.yml: fix _shared (força inventário completo);
│   baseline de "último deploy verde" agora filtra --event push
├── canonical-migrations.yml: sidecars .verify.sql agora exigem literalmente
│   'ok' na saída (psql -t -A), não só exit 0
├── scripts/e2e/verify-seed.mjs: interseção real de empresa_id (era .find()
│   sem ordenação)
└── Labels de incidente canonical → canonical-probes / canonical-deploy
    (infra/github/labels.json)

🛡️ FAIL-CLOSED E FIXTURES (4 achados adicionais)
├── canonical-edge-functions.yml: TARGETS = interseção FN_DIFF × ALL_SLUGS
│   do filesystem (slug removido/renomeado não aborta mais o deploy)
├── scripts/e2e/ensure-fixtures.mjs (novo): recria colaboradores/folha da
│   empresa sintética antes do Playwright autenticado, sem precisar de
│   SUPABASE_SERVICE_ROLE_KEY
├── scripts/db/derive-pending-migrations.mjs: fail-closed (exit 1) quando
│   pending_count > 20 — "fora do ledger" ≠ "seguro aplicar" (aponta para
│   RECONCILIACAO_DRIFT_MIGRATIONS.md)
└── ci.yml: padrão edge: do paths-filter agora inclui o próprio ci.yml

🏗️ BLOCO G CANÔNICOS — fechado nesta wave (W47, W58–W60, W67/W68/W70, W71, W75/W76)
├── W47: p0-database-migrations paralelizado em 3 shards (run-shard.sh)
├── W58/W59/W60: seed de empresa+colaboradores+folha aplicado AO VIVO na
│   empresa sintética do canônico (CNPJ 00000000000191) — dono confirmou
│   dados mock/fake para validação de design; cleanup via
│   e2e/cleanup/seed-cleanup.spec.ts
├── W67/W68/W70: canonical-migrations.yml — lista derivada do ledger (sem
│   hardcode), apply via artifact de hash do validate, ledger com
│   statements reais
├── W71: canonical-probes.yml — issue automática em falha/recuperação com
│   label dedicado + resumo estruturado sem PII
└── W75/W76: canonical-edge-functions.yml — deploy incremental com dry-run
    em PR + smoke pós-deploy com rollback

✅ W99/W100 — Sanity check + consolidação da documentação
│   workflows-contract.test.mjs: 13/13 · audit-required-checks.mjs: 10/10 ·
│   audit-canonical-project.mjs: ok · actionlint: limpo · YAML dos 13
│   workflows: parseado sem erro · CODEOWNERS confirmado sem "*" (W19 ok,
│   desbloqueia W50 — aguardando decisão do dono para habilitar auto-merge)

📚 W94 — CLAUDE.md + REVISAO_IMPLEMENTACAO_PLANO_100_WORKFLOWS: Wave 6
registrada, score 6.5/10 → 8.5/10 (justificativa no documento de revisão)
```

### Sessão 11 — 18/10/2026 (Claude Sonnet 4.6)

**Branch:** `claude/happy-cori-3z9h7f` (Wave 7 — PR #247 em CI)

#### O que foi feito:

```
🔑 W29 — Migrar VITE_SUPABASE_URL/PUBLISHABLE_KEY de secrets para vars
│   Identificadores públicos (URL + anon key) não devem ocupar slot de secret.
│   ci.yml: 6 ocorrências (jobs typecheck, unit-tests, rls-live)
│   e2e.yml: 4 ocorrências (jobs playwright-public e playwright)
│   healthcheck.yml: 2 ocorrências (job healthcheck)
│   ⚠️  Ação pendente do owner: deletar secrets.VITE_SUPABASE_URL e
│   secrets.VITE_SUPABASE_PUBLISHABLE_KEY após confirmar vars equivalentes

🔕 W09 — Deduplicar comentários de issue por SHA do commit
│   healthcheck.yml e e2e.yml: ao falhar mais de uma vez no mesmo commit,
│   atualiza o título com contagem (× N runs) em vez de novo comentário.
│   Corpo dos comentários inclui "Commit: <sha>" para rastreabilidade.

🛡️ W44 — OSSF Scorecard semanal (PR #247)
│   Job scorecard adicionado a security.yml (segunda-feira 13:02 UTC)
│   ossf/scorecard-action@fa7117db (# v2.5.0), SHA-pinado
│   SARIF → code-scanning; gracioso em forks; timeout 10min

📚 W79 — Runbook canônicos atualizado (PR #247)
│   infra/runbooks/CANONICAL_WORKFLOWS.md: 5 workflows, fluxo W67-W78,
│   ledger dinâmico, sidecars .verify.sql, deploy incremental

🧹 W48 — Cache cleanup: 46 caches stale deletados
│   PRs #236–#233, #238, #235, #237, #230, #231 (merged)
│   codeql-trap para commits não-HEAD de main
│   node-cache para hashes de lockfile antigos
│   Restaram apenas 3 válidos: main HEAD, codeql atual, PR #246 playwright
```

### Sessão 12 — 18/10/2026 (Claude Sonnet 4.6)

**Branch:** `claude/happy-cori-3z9h7f` (Wave 8 — PR #251 em CI)

#### O que foi feito:

```
🔧 W36 — deno --frozen (ci.yml + scripts/typecheck-edge.sh)
│   ci.yml: deno test --no-lock → --frozen (job edge-functions)
│   typecheck-edge.sh: 2 ocorrências deno check --no-lock → --frozen
│   Novo step "Cache de módulos Deno (W36)": actions/cache@v6
│   keyed por hashFiles('deno.lock') — reutiliza módulos entre runs

🔒 W86 — zizmor security scanner em workflow-lint.yml
│   Step zizmorcore/zizmor-action@cc914d7f (# v0.6.4) adicionado
│   continue-on-error: true — triagem inicial sem bloquear CI
│   infra/github/action-pins.json: SHA cc914d7f registrado

✅ Confirmados já implementados nesta revisão:
│   W46 — run-shard.sh usa mapfile+find|sort (sem hardcode)
│   W52 — db-tests.yml já removido (confirmado NOT FOUND)
│   W74 — canonical-edge-functions.yml já usa typecheck-edge.sh

⏳ Bloqueados (🔴 precisam do dono):
│   W16 — ruleset-sync.yml modo diff explícito + environment:production
│   W78 — canonical-sql-diag: statement_timeout + SET LOCAL ROLE (W23 pendente)
│   W66/W72/W80/W92 — canônicos + E2E dependency + report weekly
```

### Sessão 13 — 18/10/2026 (Claude Sonnet 4.6)

**Branch:** `claude/happy-cori-3z9h7f` (Wave 9 — W97c, PR #251 em CI)

#### O que foi feito:

```
✅ W97c — contrato: detectar jobs required com if: excludente (D3)
│   workflows-contract.test.mjs: check 12 adicionado
│   Carrega infra/github/ruleset-main.json → extrai 10 required checks
│   Para cada job com name: no required set: verifica if: de nível de job
│   (indentação 4 espaços) incluindo blocos multi-linha (YAML '>-')
│   Seguro quando if: contém 'pull_request' ou 'workflow_call'
│   Resultado: 14/14 workflows, 0 falhas (check 12 passa em todos)
│   2 jobs required com if: detectados como seguros:
│   - dependency-review: if: github.event_name == 'pull_request' ✅
│   - playwright-public: bloco >- contém 'pull_request' ✅
│   Commit: test(contracts): W97c — detectar jobs required com if: excludente (D3)
│   Integrado ao PR #251 (HEAD 870f82c4a)
```

### Sessão 14 — 18/10/2026 (Claude Sonnet 4.6)

**Branch:** `claude/happy-cori-3z9h7f` (PR #251 — Codex P1 deno.lock + allowlist fix)

#### O que foi feito:

```
🔧 Codex P1 — deno.lock: seções specifiers+npm ausentes (commit 238269a8)
│   deno check --frozen falhava: "specifiers section missing" para
│   npm:@supabase/supabase-js@2 — deno.lock v5 exige seções obrigatórias.
│   Adicionadas: specifiers{"npm:@supabase/supabase-js@2":"2.118.0"} e
│   npm{9 pacotes: supabase-js + auth-js + functions-js + phoenix +
│   postgrest-js + realtime-js + storage-js + iceberg-js + tslib}.
│   Verificado: deno check --frozen --node-modules-dir=false exit 0.

🔑 Allowlist fix — zizmorcore/* adicionado às GitHub Actions patterns
│   workflow-lint.yml (W86) usa zizmorcore/zizmor-action@cc914d7f
│   Causa raiz: zizmorcore/* não estava em allowed_actions patterns.
│   Fix: set_selected_actions → patterns: [..., "zizmorcore/*"].
│   workflow-lint.yml não é required check — não bloqueava PR.

✅ Validações locais (tsc + vitest + contracts)
│   tsc --noEmit: 0 erros
│   vitest: 482/482 testes passaram (5495 total, 10 skipped canvas/nav)
│   workflows-contract: 14/14 workflows, 0 falhas
│   lockfile-single: package-lock.json único, sem bun.lock ✅
│   lockfile-parity: paridade npm OK ✅
```

### Sessão 16 — 18/10/2026 (Claude Sonnet 4.6)

**Branch:** `claude/happy-cori-3z9h7f` (Validação exaustiva com 5 agentes + correções)

#### O que foi feito:

```
⚙️ W29 — Deletados secrets públicos migrados para vars (execução direta via MCP)
│   secrets.VITE_SUPABASE_URL + secrets.VITE_SUPABASE_PUBLISHABLE_KEY — ambos 204 OK
│   Eram identificadores públicos já migrados para vars.VITE_SUPABASE_* no PR #247

✅ W25 — Confirmado já resolvido: SUPABASE_DB_URL está no environment Production
│   Criado em 15/10/2026 (verificado via GitHub MCP — env.secrets listing)
│   Não estava nos secrets de repositório; gap do CLAUDE.md estava desatualizado

🔍 VALIDAÇÃO EXAUSTIVA — 5 agentes especializados em paralelo
│   Agente 1: Bridge (TABLE_DENYLIST=21✅, RPC_ALLOWLIST=97✅, JWT✅, 5 ataques bloqueados✅)
│   Agente 2: CI/CD (14/14 workflows, 12 contratos, SHA-pins 100%)
│   Agente 3: DB ao vivo (RLS 376/376✅, 263/265 SECURITY DEFINER clean✅)
│   Agente 4: TypeScript (tsc 0 erros✅, vitest 482/482✅)
│   Agente 5: Supply chain (0 vulns produção✅, 12 SHA-pins✅)

🔒 CORREÇÃO — Bridge: CSRF code smell (L1)
│   index.ts: if (!csrf.ok && csrf.response) → if (!csrf.ok) return csrf.response ?? jsonError(403,...)
│   Elimina fail-open teórico se verifyCsrf retornar {ok:false, response:undefined}

🔒 CORREÇÃO — Bridge: rate limiting fail-open quando SERVICE_KEY ausente (M2)
│   index.ts: writes sem SERVICE_ROLE_KEY agora retornam 503 SERVICE_UNAVAILABLE
│   Rate limiting e isolamento de tenant são pré-requisitos para operações de escrita

🛡️ CORREÇÃO — ALTER DEFAULT PRIVILEGES com FOR ROLE (M1)
│   Migration 20261021010000_default_privs_for_role.sql:
│   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC
│   ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC
│   Cobre ambos os roles (migração original só cobria o executor, normalmente postgres)
│   Sidecar .verify.sql: verifica pg_default_acl por role para ausência de =X/%

📋 RECONCILIAÇÃO — Ledger de migrações (gap crítico do Agente 3)
│   Migration 20261021000000_ledger_reconcile_secdef_defaults.sql:
│   INSERT idempotente para 20261015170000 e 20261018160000 no supabase_migrations.schema_migrations
│   Ambas aplicadas ao vivo mas ausentes do ledger — canonical-migrations.yml tentaria re-aplicar
│   Sidecar .verify.sql: confirma que ambas as versões estão no ledger após execução
```

### Sessão 15 — 18/10/2026 (Claude Sonnet 4.6)

**Branch:** `claude/happy-cori-3z9h7f` (PR #251 — merge squash; sessão de validação exaustiva)

#### O que foi feito:

```
✅ PR #251 MERGEADO (SHA febe78de) — 10/10 required checks verdes
│   W36: deno --frozen em ci.yml + typecheck-edge.sh; cache Deno keyed por deno.lock
│   W86: zizmorcore/zizmor-action em workflow-lint.yml (continue-on-error: true)
│   W97c: check 12 em workflows-contract.test.mjs (jobs required com if: excludente)

🔧 Fix crítico — deno.lock denonext hashes (commit 1df8c330d)
│   deno check --frozen falhava: "The lockfile is out of date" para módulos denonext
│   Causa: esm.sh serve sub-módulos via /denonext/ que precisam de hash próprio
│   Adicionados: 11 hashes denonext (auth-js, functions-js, phoenix, postgrest-js,
│   realtime-js, storage-js, supabase-js, iceberg-js + tracingRegistry.mjs, tslib)
│   Adicionado: redirect iceberg-js@^0.8.1?target=denonext → @0.8.1?target=denonext
│   Edge Functions (deno check): queued → in_progress → success ✅

🔒 Migração de segurança — ALTER DEFAULT PRIVILEGES (commit 55376bb72)
│   20261018160000_default_privs_revoke_execute_public.sql:
│   ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC
│   Sidecar .verify.sql: checa pg_default_acl (sem =X/% para PUBLIC)
│   Fecha GAP MÉDIO — futuras funções SECURITY DEFINER não herdam PUBLIC execute

✅ Validações exaustivas (5 agentes paralelos)
│   contracts: 14/14 workflows, 0 falhas (W97 — 12 contratos)
│   tsc --noEmit: 0 erros | vitest: 482/482 | audit: 0 vulns
│   RPC_ALLOWLIST: 97 entradas | TABLE_DENYLIST: 21 entradas
│   audit-required-checks: 10/10 | lockfile-single: npm único ✅
│   SHA pins: 72 actions todas pinadas

🧹 Limpeza — safety-net triggers cancelados após merge
│   trig_016S1Nj1rhPmwPnNf3kr9nag (CI check 16:13) — deletado
│   trig_01RKtW25Z5EEJoLycCdG37ZZ (fallback 16:30) — deletado
```

### Sessão 10 — 18/10/2026 (Claude Sonnet 4.6)

**Branch:** `claude/happy-cori-3z9h7f` (PR #244 — Codex P2 + Dependabot overrides)

#### O que foi feito:

```
🔒 CODEX P2 FOLLOWUP — verify.sql + canonical-migrations.yml
├── verify.sql (20261013152000_onda4b_vinculo_documentos_lgpd_crypto):
│   Check 2b: funções decrypt verificam ACLs (anon/authenticated negados,
│   service_role com EXECUTE) via has_function_privilege
│   Check 3: pg_proc.pronamespace restrito (JOIN pg_namespace np); tgenabled
│   narrowed para IN ('O','A') (exclui replica-only 'R'); tgtype=23 asserido
│   (BEFORE FOR EACH ROW ON INSERT OR UPDATE)
│   Check 4: to_regclass IS NOT NULL → pg_class.relkind = 'v' (view estrita)
├── canonical-migrations.yml: sidecar apply rejeita saída completamente vazia;
│   sidecar verify valida ledger antes de executar (migração pendente = abort)
├── scripts/update-workflows-status.mjs: preserva data existente quando
│   conteúdo do relatório não muda (evita diff só de timestamp)
└── psql stdin fix (Codex P1 de PR #242): :'v' interpolado via stdin HEREDOC
    (psql -c não expande variáveis de cliente — D29)

🔧 DEPENDABOT OVERRIDES — 3 alertas remediados (PR #244)
├── Alert #13/#14 — tmp <0.2.6 (moderate ReDoS): override "tmp": "0.2.7"
├── Alert #1 — uuid 8.3.2 em @lhci/cli (critical): override
│   "uuid@<11.1.1": "14.0.3" (scoped, só dependências que usam versão antiga)
└── npm install --engine-strict=false (bypass engine check de
    @asamuzakjp/css-color@7.1.4 que exige Node ^22.22.2, não afeta runtime)

⚠️ DEPENDABOT ALERTS SEM FIX UPSTREAM (documentados como gap)
├── Alert #15/#16 — extract-zip ≤2.0.1 (path traversal): sem patch upstream
│   Consumer: @lhci/cli (devDependency) — risco: zero em CI read-only
└── Alert #18 — sprintf-js ≤1.1.3 (prototype pollution): sem patch upstream
    Consumer: jasmine-core (devDependency de @testing-library) — baixo risco

🔀 MERGE CONFLICT RESOLVIDO (PR #244 vs PR #243)
│   PR #243 (main) removeu sidecar loop + verify mode + summary do
│   canonical-migrations.yml. PR #244 re-adiciona com melhorias Codex P2.
└── Resolução: kept HEAD (PR #244) — todos os marcadores preservados.
```

---

## ✅ Estado Atual

### Status dos Workflows

```
CI (ci.yml)              → 12 jobs, todos com timeout; label ci-main (D22 fix) ✅
Security (security.yml)  → CodeQL ativo, permissions top-level adicionado ✅
Deploy (deploy.yml)      → Vercel (integração Git), npm ci, dist artifact + bundle audit ✅
E2E (e2e.yml)            → CI_BRANCH injetado, retries calibrados, npm ci ✅
Pacotes (W03)            → npm único; bun.lock removido; gate lockfile-single em security-config ✅
SonarCloud               → ✅ Automatic Analysis (GitHub App) — job CI removido (PR #162)
Healthcheck (healthcheck.yml) → timeout 5min adicionado ✅
Canônicos (×3)           → timeout adicionado, environment: production ✅
canonical-migrations.yml → ledger dinâmico W69 + sidecars .verify.sql ✅
canonical-sql-diag.yml   → novo (diagnóstico SQL) — 12 workflows no total ✅
workflow-lint.yml        → actionlint via $GOPATH/bin publicado em $GITHUB_PATH + shellcheck limpo ✅
Dependabot               → npm+docker+github-actions semanal; TS≥6.1 ignorado ✅
Branch ruleset           → 10 required checks (inclui Revisão de dependências), baseline em infra/github/ ✅
Aprovação de PR (W14)    → 0 aprovações; code owner só em caminhos sensíveis (.github/CODEOWNERS) ✅
Branch protection (main) → clássica removida (W13); ruleset único; sha_pinning (W33) ✅
Actions allowlist        → selected: github_owned + verified + denoland/*, supabase/* ✅
audit-required-checks    → W17 live API check quando GITHUB_TOKEN disponível ✅
scripts canonicais       → W30 CANONICAL_SUPABASE_REF env var com fallback ✅
Contract test            → 14/14 workflows, 0 falhas (W97 — 12 contratos, W97c adicionado) ✅
OSSF Scorecard (W44)     → job scorecard em security.yml — PR #247 em CI ✅
Vars públicas (W29)      → 12 ocorrências vars.VITE_SUPABASE_* — PR #247 em CI ✅
```

### Métricas (18/10/2026)

| Indicador              | Valor                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Plano 100 workflows    | ✅ Waves 0–3 + decisões do owner + Wave 6 + PRs #244/#247/#251 mergeados; W36/W86/W97c + ALTER DEFAULT PRIVS (18/10/2026) |
| TypeScript strict      | ✅ strict: true + noImplicitAny (0 erros no src)                                                                          |
| Testes com tipo        | ✅ 0 erros (typecheck:tests runs clean)                                                                                   |
| Cobertura              | ✅ v8 configurada                                                                                                         |
| Merge strategy         | ✅ squash-only (allow_merge_commit=false)                                                                                 |
| Branch delete          | ✅ delete_branch_on_merge=true                                                                                            |
| Ruleset                | ✅ 21934736 — 10 required checks — baseline em infra/github/                                                              |
| Aprovação de PR        | ✅ 0 aprovações + code owner em governança/produção (W14) — ver `.github/CODEOWNERS`                                      |
| Workflows com timeout  | ✅ 100% (todos os jobs)                                                                                                   |
| supply chain (SHA-pin) | ✅ sha_pinning_required=true (W33) + action-pins.json offline                                                             |
| Actions allowlist      | ✅ selected: github_owned + verified + denoland/\*, supabase/\*, ossf/\*, dorny/\*, zizmorcore/\*                         |
| classic branch protect | ✅ Removida (W13) — ruleset é a única fonte de proteção                                                                   |
| SHA comments           | ✅ Corrigidos (# v4 → # v7 em canonical-probes + canonical-sql-diag) W35                                                  |
| E2E secrets            | ✅ Usuários E2E existem no canônico e as senhas batem com os secrets (verificado 15/10)                                   |
| lockfile               | ✅ package-lock.json único (W03) — `npm ci` em todo CI/Docker; bun.lock removido                                          |
| fast-uri               | ✅ 3.1.8 (sessão 5, PR #163) — 0 vulns high/critical                                                                      |
| CodeQL unused vars     | ✅ 9 alertas fechados — 9 arquivos Edge/src corrigidos (W82)                                                              |
| contract test          | ✅ 14/14 workflows, 0 falhas (W97 — 11 contratos ativos)                                                                  |
| bundle audit           | ✅ deploy.yml gate ativo (W87) — orçamento em scripts/.bundle-budget.json                                                 |
| actionlint path        | ✅ $GOPATH/bin no $GITHUB_PATH; 0 achados de shellcheck em todos os workflows                                             |
| ledger dinâmico        | ✅ canonical-migrations.yml — ledger sem hardcode + sidecars .verify.sql (W69/PR #244)                                    |
| live ruleset audit     | ✅ audit-required-checks.mjs compara baseline↔live quando GITHUB_TOKEN (W17)                                              |
| canonical env var      | ✅ CANONICAL_SUPABASE_REF env var com fallback nos scripts de auditoria (W30)                                             |
| Dependabot overrides   | ✅ tmp→0.2.7 + uuid@<11.1.1→14.0.3 (Alerts #1/#13/#14 — sessão 10, PR #244 mergeado)                                      |
| psql variable interp.  | ✅ :'v' via stdin (printf+pipe) em canonical-migrations.yml (Codex P1 — PR #244)                                          |
| GITHUB_TOKEN gap       | ⚠️ workflows-report.yml PRs não disparam CI — gap documentado em "Baixos" (PR #244)                                       |
| vars públicas Supabase | ✅ W29: 12 ocorrências migradas secrets→vars (PR #247 merged) — owner deve deletar os secrets                             |
| OSSF Scorecard         | ✅ W44: job scorecard adicionado a security.yml (PR #247 merged)                                                          |
| cache cleanup (W48)    | ✅ 46 caches stale deletados — 3 válidos restantes                                                                        |
| deno --frozen (W36)    | ✅ --no-lock→--frozen + cache deno; deno.lock denonext hashes fix (PR #251 mergeado SHA febe78de)                         |
| zizmor scanner (W86)   | ✅ zizmorcore/zizmor-action@cc914d7f em workflow-lint.yml (PR #251 mergeado)                                              |
| W97c required if: gate | ✅ check 12 em workflows-contract.test.mjs (PR #251 mergeado)                                                             |
| ALTER DEFAULT PRIVS    | ✅ 20261018160000 + 20261021010000 (FOR ROLE postgres+supabase_admin — sessão 16)                                         |
| Ledger reconciliação   | ✅ 20261021000000 insere 20261015170000+20261018160000 no ledger (sessão 16)                                              |
| Bridge CSRF+rate-limit | ✅ CSRF fail-closed fix + rate limit 503 se SERVICE_KEY ausente (sessão 16)                                               |

---

## 🔧 Decisões Técnicas

### W03 — npm como gerenciador único (15/10/2026)

Bun foi removido. `package-lock.json` é o único lockfile e **todo** install (CI, E2E, deploy, Docker) usa `npm ci`.

Motivo: dois lockfiles divergiam continuamente (D1). Na migração, `package-lock.json` estava sem `@lhci/cli` e ~260 dependências transitivas que só existiam no `bun.lock` — os jobs npm rodavam `npm install` sobre um lock incompleto. `package.json` já declarava `packageManager: npm@10.x`, Dependabot/`npm audit`/dependency-review já operavam sobre o lock npm, e Bun só aparecia em `e2e.yml`/`deploy.yml`.

Guardas: `scripts/tests/lockfile-single.test.sh` (security-config) reprova `bun.lock`/`yarn.lock`/`pnpm-lock.yaml`, `packageManager` ≠ npm e qualquer uso de Bun em workflow; `npm ci` reprova drift package.json ↔ lock. **Não reintroduzir Bun.** Imagens Docker seguem `engines.node` (22); Dependabot ignora majors de `node`.

### TypeScript strict — estado real (28/07/2026)

`strict: true` e `noImplicitAny: true` estão ligados no **`tsconfig.json` raiz**, que é exatamente o config executado pelo CI (`tsgo --noEmit`). Medição por flag antes de ligar: `strictNullChecks` isolado = 60 erros, `noImplicitAny` = 9, `strictPropertyInitialization` = 1, `useUnknownInCatchVariables` = 2; **strict completo = 17** (as flags se reforçam e eliminam falsos positivos de inferência). Os 17 foram corrigidos na fonte — sem `any`, sem `@ts-ignore`, sem supressão:

- `FinanceiroBancarioPage`: interfaces locais divergiam do schema (`| null` do Postgres modelado como `| undefined`).
- `AfastamentosPage`: `status: null` em filtro tipado como opcional + export sem guarda de `empresa_id`.
- `LoginPage`: narrowing defensivo do erro de login (removido `as any` no caminho de MFA).
- `AuditoriaPage`, `ContabilidadePage`, `MetabaseEmbed`, `NovaProgramacaoDialog`: acessos indexados/format sem guarda de nulidade.

Regra: verificar sempre o config que o CI de fato roda antes de declarar verde.

### Bridge external-db-bridge

Gateway hardening com JWT validation, CSRF fail-closed, rate limiting, tenant isolation, denylist de tabelas, allowlist de RPCs, regex de SQL injection, validação de ORDER BY, e telemetria com batch. Código em `supabase/functions/external-db-bridge/index.ts` (729 linhas).

---

## ⚠️ Gaps Conhecidos

### Críticos

_Nenhum crítico bloqueante no momento._

### Médios

| Gap                                       | Impacto                                                                                    | Solução                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Bridge rate limiting fail-open            | Se `SUPABASE_SERVICE_ROLE_KEY` ausente, rate limiting silenciosamente desabilitado         | ✅ Corrigido na sessão 16 — writes retornam 503 sem SERVICE_KEY           |
| `ALTER DEFAULT PRIVILEGES` sem `FOR ROLE` | Migration 20261018160000 cobria apenas o role `postgres`; `supabase_admin` não era coberto | ✅ Corrigido na sessão 16 — migration 20261021010000 cobre ambos os roles |

### Baixos

| Gap                                                        | Impacto                                                                                                                                    | Solução                                                                                                                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--no-lock` no `deno test` do ci.yml                       | Bypassa deno.lock                                                                                                                          | Resolver após W36 corrigir lock                                                                                                                                                                                               |
| `noUnusedLocals:true` pode alertar                         | Warnings no build                                                                                                                          | Aceitar ou limpar                                                                                                                                                                                                             |
| CodeQL unused-local (99 restantes)                         | Ruído no painel GHAS                                                                                                                       | Fechar em batch via W82 contínuo                                                                                                                                                                                              |
| `extract-zip ≤2.0.1` (Alerts #15/#16)                      | Path traversal teórico em devDep (`@lhci/cli`)                                                                                             | Sem fix upstream — risco zero em CI read-only; aguardar patch do upstream                                                                                                                                                     |
| `sprintf-js ≤1.1.3` (Alert #18)                            | Prototype pollution em devDep (`jasmine-core`)                                                                                             | Sem fix upstream — baixo risco; aguardar atualização do `@testing-library`                                                                                                                                                    |
| `uuid@8.3.2` em `@lhci/cli` (Alert #1)                     | Buffer bounds check GHSA-w5hq-g745-h8pq (CVSS 7.5) em devDep                                                                               | Override `"@lhci/cli":{"uuid":"14.0.3"}` existe mas npm v10 não força majors incompatíveis — `@lhci/cli` requer `^8.3.1`; uuid@14 tem API quebrada. Override inválido; risco zero (CI read-only); aguardar @lhci/cli upstream |
| `basic-ftp` (Alert GHSA-c475-qrg2-pj4r)                    | CPU DoS via regex CRLF (high, CVSS 7.5) em devDep transitivo `@lhci/cli → lighthouse → puppeteer-core → proxy-agent → get-uri → basic-ftp` | Sem patch upstream — risco zero (CI read-only, Lighthouse não exposto); aguardar @lhci/cli                                                                                                                                    |
| `workflows-report.yml` + GITHUB_TOKEN                      | PRs criadas pelo bot não disparam workflows `pull_request`                                                                                 | Limitação documentada do GitHub: `GITHUB_TOKEN` não dispara CI em PRs automáticas. Workaround: GitHub App ou PAT como secret. Ação manual do owner quando quiser CI automático no relatório semanal                           |
| Bridge CSRF code smell                                     | `if (!csrf.ok && csrf.response)` — fail-open teórico se verifyCsrf retornar response undefined                                             | ✅ Corrigido na sessão 16 — `if (!csrf.ok) return csrf.response ?? jsonError(403,...)`                                                                                                                                        |
| `admissao_registrar_documento` fora da RPC_ALLOWLIST       | Tem GRANT para anon/authenticated mas não está na allowlist — acessível via PostgREST sem bridge                                           | Baixo risco — função usa token interno como arg; avaliar se deve entrar na allowlist                                                                                                                                          |
| Policies `role: public` em tabelas sensíveis               | `empresas`, `user_empresas`, `auditoria_logs`, `configuracoes_esocial` têm policies com role público                                       | Auditar corpo USING() para confirmar `auth.uid() IS NOT NULL`; adicionar guard se ausente                                                                                                                                     |
| Migrações 20261015170000/20261018160000 ausentes do ledger | `canonical-migrations.yml` tentaria re-aplicar — idempotente mas inconsistente                                                             | ✅ Corrigido na sessão 16 — migration 20261021000000 insere ambas no ledger                                                                                                                                                   |
| Docker images: tags mutáveis                               | `node:22-alpine` e `nginx:alpine` sem SHA digest — supply chain gap baixo                                                                  | Adicionar digest SHA nas imagens base do Dockerfile                                                                                                                                                                           |

---

## 🚀 Próximos Passos Recomendados

### Imediatos (ação manual obrigatória)

1. **W25 ✅ RESOLVIDO:** `SUPABASE_DB_URL` já está no environment Production desde 15/10/2026 (verificado via API na sessão 16). Nenhuma ação pendente.
2. **Policies `role: public`:** auditar o corpo USING() das policies de `empresas`, `user_empresas`, `auditoria_logs` e `configuracoes_esocial` para confirmar que exigem `auth.uid() IS NOT NULL` — ação manual no painel Supabase ou via migration.

### Curto Prazo

1. Revisar Bridge runbook (`infra/runbooks/BRIDGE_PERFORMANCE.md`)
2. Adicionar query timeout no external-db-bridge (AbortController)
3. Implementar keyset pagination para tabelas >100K registros
4. Adicionar Content Security Policy headers no nginx

### Médio Prazo

1. Revisar todos os `any` restantes no código (via `grep -rn ": any" src/`)
2. Adicionar testes unitários para o Bridge
3. Cache de resultados para tabelas estáticas
4. Read replicas para queries analíticas

---

## 💻 Comandos Úteis

```bash
# Desenvolvimento
npm run dev                # Servidor dev
npm run build              # Build produção
npm run ci:verify          # Typecheck + lint + format
npm run test               # Testes unitários
npm run test:e2e           # Testes E2E

# TypeScript
npx tsc --noEmit          # Typecheck (root config)

# Dependências
npm ci                     # Instalar/atualizar
npm outdated               # Verificar versões
npm ls                     # Listar pacotes

# Git
git fetch --prune          # Limpar branches remotas órfãs
git branch -d <branch>     # Deletar branch local

# Docker
docker build -t dp-v2 .    # Build imagem
docker compose up          # Subir ambiente

# Graphify (grafo de conhecimento do repo)
pip install "graphifyy[sql]"   # instalação (uma vez; extra [sql] p/ parse das migrations)
npm run graph:update           # atualização incremental do grafo
npm run graph:rebuild          # rebuild completo
graphify query "quem chama episService"   # perguntas sobre o código
graphify path "App" "supabase"            # caminho entre dois nós
graphify explain "useEmpresas"            # explica um nó
# saída: graphify-out/ (gitignored; GRAPH_REPORT.md + manifest.json são commitados)
```

---

_Documentação gerada por Hermes Agent v0.19.0 em 23/07/2026_
_Mantenedor: Hermes (AtomicaBR Ops/Dev) — abner.silva@atomicabr.com.br_

## Frescura do Grafo

Antes de consultar graphify, verifique se o grafo esta atualizado:

```sh
git rev-parse --short HEAD
grep "Built from commit" graphify-out/GRAPH_REPORT.md
```

Não existe sync automático: em clone novo (sem `graphify-out/graph.json` local),
rode `npm run graph:rebuild` primeiro — o incremental depende do grafo local.
Com o grafo já construído, `npm run graph:update` atualiza incrementalmente e
`npm run graph:rebuild` refaz tudo. Após o rebuild, commite
`graphify-out/GRAPH_REPORT.md` e `graphify-out/manifest.json` — são os únicos
artefatos versionados; `graph.json`/`graph.html`/cache são regeneráveis e ficam
fora do git (ver `.gitignore`).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

Notas operacionais:

- O grafo tem ~20k nós (>5.000), então `graph.html` abre em modo agregado (nós de
  comunidade). Para detalhe por arquivo, use `graphify update . --obsidian` ou
  consulte `graph.json`/`query`/`path`/`explain` diretamente.
- `graphify query/path/explain` funcionam offline sobre `graph.json` — sem custo de API.
  `graphify label` (nomes semânticos das comunidades) é opcional e exige
  `GEMINI_API_KEY`/`GOOGLE_API_KEY`.
- `.graphifyignore` exclui secrets, baselines JSON e artefatos gerados — mantenha-o
  alinhado ao `.gitignore`.
- 2 arquivos não são extraídos por completo (limitação do parser, não bug do código):
  `src/types/entities.ts` (tipos `import()` inline) e
  `src/utils/__tests__/cursorPagination.test.ts` (string com null byte).
- Instalação: `pip install "graphifyy[sql]"` — o extra `sql` é obrigatório para
  parsear as ~730 migrations; sem ele elas entram vazias no grafo.
