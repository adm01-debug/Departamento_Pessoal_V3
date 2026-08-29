# AI Context — Departamento Pessoal v2

> Documentação para agentes de IA (Hermes, Claude Code, Cursor, Copilot, etc)
> Última atualização: 23/07/2026
> Mantenedor: Hermes Agent (AtomicaBR Ops/Dev)

> ⚠️ **Correções de auditoria (23/07/2026)** — revisão do batch anterior:
> - `typescript` **re-pinado 7.0.2 → 6.0.3**. TS 7 quebrava o `typescript-eslint` (peer `>=4.8.4 <6.1.0`) → `lint:ci` abortava (CI vermelho). **NÃO re-bumpar `typescript` para ≥6.1.0** até o typescript-eslint suportar. O `tsgo` (typecheck) vem do pacote separado `@typescript/native-preview`, não afetado.
> - Bucket de storage **`ferias-avisos` criado** (migração `20260723113000`). O batch da feature de assinatura criou as policies RLS mas nunca o bucket → upload do PDF falhava em runtime ("Bucket not found").
> - Corrigidos 3 erros de tipo de mock em `loggerService.test.ts` (vitest 4).
> ✅ **Resolvido (28/07/2026)** — `tsconfig.app.json` foi removido (era órfão). O único config é `tsconfig.json` (raiz), o mesmo que o CI roda via `tsgo --noEmit`, agora com **`strict: true` + `noImplicitAny: true`** e **0 erros** (17 erros reais corrigidos em 7 arquivos).
> ✅ **Resolvido (28/07/2026)** — `build.minify` migrado para a forma de objeto do Vite 8/OXC (`{ type: 'oxc', compress: { dropConsole: [...] } }`). Auditoria do bundle: os `console.*` remanescentes são **100% de vendor chunks** (jspdf, vendor-react, vendor-supabase), sem PII e sem origem no nosso código.
> - ⚠️ Pendente: arquivos de teste (`**/*.test.ts(x)`, `__tests__/`) seguem **excluídos** do typecheck — 232 erros de tipo sob strict apenas em testes.

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
| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Runtime** | Node.js (Docker) | 22 LTS |
| **Linguagem** | TypeScript (strict) | 6.0.3 |
| **Framework** | React | 19.2.8 |
| **Build** | Vite | 8.1.4 |
| **Bundler** | Bun | 1.3.14 |
| **Testes** | Vitest | 4.1.10 |
| **E2E** | Playwright | 1.61.1 |
| **Estilos** | Tailwind CSS | 4.3.3 |
| **Banco** | Supabase (self-hosted) + External DB Bridge |

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
│   ├── workflows/                # GitHub Actions (7 workflows)
│   │   ├── ci.yml                # CI principal (typecheck+lint+test)
│   │   ├── deploy.yml            # Deploy preview
│   │   ├── security.yml          # CodeQL + npm audit
│   │   ├── e2e.yml               # Playwright E2E
│   │   └── branch-protection.yml # Proteção de branch
│   └── dependabot.yml            # Dependabot (grouped updates)
├── config/                       # Config filters
├── docker/                       # Dockerfiles auxiliares
├── scripts/                      # Scripts de build/audit
├── docs/                         # Documentação externa
├── e2e/                          # Testes E2E (Playwright)
└── public/                       # Assets estáticos
```

### Pipelines CI/CD
| Workflow | Gatilho | Ações |
|----------|---------|-------|
| **ci.yml** | push/PR/workflow_dispatch | Bun→Node fallback, typecheck, lint, test |
| **deploy.yml** | PR preview/workflow_dispatch | Build + Deploy Netlify preview |
| **security.yml** | push/PR/schedule/workflow_dispatch | CodeQL + npm audit |
| **e2e.yml** | push/PR | Playwright tests |
| **branch-protection.yml** | workflow_dispatch | API para proteger main (requer PAT) |

### Segurança do Bridge (external-db-bridge)
```
POST-only gateway (32KB file, 729 lines)
├── JWT validation (getClaims) para writes
├── CSRF fail-closed (verifyCsrf)
├── Rate limiting (30 writes/100 reads por min)
├── Tenant isolation (empresa_id scope)
├── Table denylist (16 tabelas sensíveis bloqueadas)
├── RPC allowlist (25 RPCs aprovadas)
├── SQL injection prevention (3 camadas regex)
├── ORDER BY column validation (ORDER_COLUMN_RE)
├── .single() query support
├── Payload cap (256KB streaming)
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
---

## ✅ Estado Atual

### Status dos Workflows
```
CI (ci.yml)              → configurado com Node fallback 🟡 (precisa: Settings→Actions)
Security (security.yml)  → CodeQL ativado 🟡 (precisa Settings)
Deploy (deploy.yml)      → Netlify preview 🟡 (precisa secrets)
E2E (e2e.yml)            → Playwright ✅ (não modificado)
Dependabot               → Groups ativos ✅ (23 PRs merged na sessão)
```

### Métricas
| Indicador | Valor |
|-----------|-------|
| Open Issues | ~7 (Dependabot automáticos) |
| Open PRs | ~7 (Dependabot automáticos) |
| TypeScript strict | ✅ Ativado |
| `any` types no app | ✅ Compatível com `strict` (0 erros de tipo no CI) |
| Testes | ✅ Configurados |
| Cobertura | ✅ v8 configurada |
| Branch protection | ❌ Não ativo (Settings manual) |

---

## 🔧 Decisões Técnicas

### Por que Bun + Node fallback?
O `oven-sh/setup-bun@v2` action não funciona em repositórios privados do GitHub (restrição de actions de terceiros). Solução: fallback para `actions/setup-node@v4` com Node.js 22.

### Por que npm install em vez de npm ci?
O projeto usa `bun.lock` como lockfile, não `package-lock.json`. `npm ci` requer lockfile. `npm install` funciona sem.

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
| Gap | Impacto | Solução |
|-----|---------|---------|
| CI não roda em repo privado | Pipeline não executa | Settings → Actions → Allow |
| Branch protection inativo | Push direto p/ main sem review | Settings → Branches → Add rule |

### Médios
| Gap | Impacto | Solução |
|-----|---------|---------|
| `bun.lock` precisa sync manual | Lockfile desatualizado após bumps | Cron sync-bun-lock já roda (30min) |
| SonarCloud sem token | Análise estática não roda | Adicionar SONAR_TOKEN nas secrets |
| Deploy Netlify sem secrets | Preview não deploya | Adicionar NETLIFY_AUTH_TOKEN + SITE_ID |

### Baixos
| Gap | Impacto | Solução |
|-----|---------|---------|
| `noUnusedLocals:true` pode alertar | Warnings no build | Aceitar ou limpar |
| Testes fora do typecheck | 232 erros de tipo latentes em `__tests__` | Incluir testes no `tsconfig` e sanear gradualmente |

---

## 🚀 Próximos Passos Recomendados

### Imediatos (settings do GitHub)
1. **Settings → Actions → General → Allow GitHub Actions** ✅ Habilita CI
2. **Settings → Branches → Add rule → main** ✅ Protege branch
3. **Adicionar secrets**: NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID, SONAR_TOKEN

### Curto Prazo
1. Rodar `bun install` local + push `bun.lock` para CI ficar verde
2. Revisar Bridge runbook (`infra/runbooks/BRIDGE_PERFORMANCE.md`)
3. Adicionar query timeout no external-db-bridge (AbortController)
4. Implementar keyset pagination para tabelas >100K registros
5. Adicionar Content Security Policy headers no nginx

### Médio Prazo
1. Revisar todos os `any` restantes no código (via `grep -rn ": any" src/`)
2. Adicionar testes unitários para o Bridge
3. Cache de resultados para tabelas estáticas
4. Read replicas para queries analíticas

---

## 💻 Comandos Úteis

```bash
# Desenvolvimento
bun dev                    # Servidor dev
bun run build              # Build produção
bun run ci:verify          # Typecheck + lint + format
bun run test               # Testes unitários
bun run test:e2e           # Testes E2E

# TypeScript
bunx tsc --noEmit          # Typecheck (root config)

# Dependências
bun install                # Instalar/atualizar
bun outdated               # Verificar versões
bun pm ls                  # Listar pacotes

# Git
git fetch --prune          # Limpar branches remotas órfãs
git branch -d <branch>     # Deletar branch local

# Docker
docker build -t dp-v2 .    # Build imagem
docker compose up          # Subir ambiente
```

---

*Documentação gerada por Hermes Agent v0.19.0 em 23/07/2026*
*Mantenedor: Hermes (AtomicaBR Ops/Dev) — abner.silva@atomicabr.com.br*

## Frescura do Grafo
Antes de consultar graphify, verifique se o grafo esta atualizado:
```sh
git rev-parse --short HEAD
grep "Built from commit" graphify-out/GRAPH_REPORT.md
```
Se divergirem, o auto-sync via N8N deve ter corrigido em ate 15 min.
Para forcar rebuild manual: `graphify update . --force`

