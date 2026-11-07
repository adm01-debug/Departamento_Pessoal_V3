# Decisões técnicas e gaps conhecidos

> Extraído do antigo `CLAUDE.md` (estado em 19/10/2026) em 07/11/2026. O histórico de sessões (1–22) foi
> descartado; o que ele dizia sobre o estado atual está no `git log` e nos PRs #244–#271.

## Decisões

### W03 — npm como gerenciador único (15/10/2026)

Bun foi removido. `package-lock.json` é o único lockfile e **todo** install (CI, E2E, deploy, Docker) usa
`npm ci`. Motivo: dois lockfiles divergiam continuamente; `package-lock.json` estava sem `@lhci/cli` e ~260
dependências transitivas que só existiam no `bun.lock`. Guardas: `scripts/tests/lockfile-single.test.sh`
(job `security-config`) reprova `bun.lock`/`yarn.lock`/`pnpm-lock.yaml`, `packageManager` ≠ npm e qualquer
uso de Bun em workflow; `npm ci` reprova drift package.json ↔ lock. **Não reintroduzir Bun.** Imagens Docker
seguem `engines.node` (22); Dependabot ignora majors de `node`.

### TypeScript pinado em 6.0.3 (23/07/2026)

TS 7 quebrava o `typescript-eslint` (peer `>=4.8.4 <6.1.0`) → `lint:ci` abortava. **Não re-bumpar
`typescript` para ≥ 6.1.0** até o typescript-eslint suportar (`dependabot.yml` já ignora). O `tsgo`
(typecheck) vem do pacote separado `@typescript/native-preview`, não afetado.

### TypeScript strict — estado real (28/07/2026)

`strict: true` e `noImplicitAny: true` no **`tsconfig.json` raiz**, exatamente o config que o CI roda
(`tsc --noEmit`); `tsconfig.app.json` órfão foi removido. Os 17 erros do strict completo foram corrigidos na
fonte — sem `any`, sem `@ts-ignore`. `typecheck:tests` roda limpo. Regra: verificar sempre o config que o CI
de fato roda antes de declarar verde.

### Bridge `external-db-bridge`

Gateway hardening com JWT, CSRF fail-closed, rate limiting, tenant isolation, denylist de tabelas, allowlist de
RPCs, regex de SQL injection, validação de ORDER BY e telemetria com batch. Detalhe em
`docs/agentes/arquitetura.md`.

### Build

`build.minify` na forma de objeto do Vite 8/OXC (`{ type: 'oxc', compress: { dropConsole: [...] } }`); os
`console.*` remanescentes no bundle são 100% de vendor chunks. Bucket de storage `ferias-avisos` criado na
migração `20260723113000` (as policies existiam sem o bucket → upload do PDF falhava).

## Gaps conhecidos (19/10/2026)

Críticos: nenhum bloqueante.

| Gap | Impacto | Situação |
| --- | --- | --- |
| `noUnusedLocals:true` pode alertar | Warnings no build | Aceitar ou limpar |
| CodeQL unused-local (99 restantes) | Ruído no painel GHAS | Fechar em batch (W82 contínuo) |
| `extract-zip ≤2.0.1`, `sprintf-js ≤1.1.3`, `uuid@8.3.2` em `@lhci/cli`, `basic-ftp` | DevDeps transitivas sem fix upstream (CI read-only) | Aguardar upstream; override de `uuid` para 14 é inválido (`@lhci/cli` exige `^8.3.1`) |
| `workflows-report.yml` + `GITHUB_TOKEN` | PRs do bot não disparam `pull_request` | Limitação do GitHub; workaround = GitHub App ou PAT (ação do dono) |
| `admissao_registrar_documento` fora da `RPC_ALLOWLIST` | Tem GRANT para anon/authenticated, acessível via PostgREST sem bridge | Baixo risco (token interno como arg); avaliar entrar na allowlist |
| Policies `role: public` em `empresas`, `user_empresas`, `auditoria_logs`, `configuracoes_esocial` | Possível acesso sem `auth.uid()` | Auditar corpo USING(); adicionar guard se ausente |
| Docker images com tags mutáveis (`node:22-alpine`, `nginx:alpine`) | Supply chain | Adicionar digest SHA |

Já resolvidos (mantidos só para não reabrir): rate limiting fail-open do bridge (503 sem SERVICE_KEY);
`ALTER DEFAULT PRIVILEGES` sem `FOR ROLE` (migration `20261021010000`); migrações `20261015170000` e
`20261018170000` ausentes do ledger (reconciliadas por `20261021000000`); CSRF code smell no bridge;
`SUPABASE_DB_URL` no environment Production; `--no-lock` no `deno test` do ci.yml (W36: `--frozen` + cache deno,
PR #251).

## Pendências herdadas do histórico (sessões 9–22, out/2026)

Itens que dependiam do dono e estavam só no histórico de sessões do antigo `CLAUDE.md`. Estado em 19/10/2026;
confirme no repo/GitHub antes de agir.

- **W50 — auto-merge**: CODEOWNERS sem regra `*` (W19) desbloqueou habilitar auto-merge no repo; "aguardando
  decisão do dono" (sessão 9).
- **Bloqueados, precisam do dono** (sessão 12): W16 (`ruleset-sync.yml` em modo diff explícito +
  `environment: production`); W78 (`canonical-sql-diag`: `statement_timeout` + `SET LOCAL ROLE`, W23 pendente);
  W66/W72/W80/W92 (canônicos + dependência do E2E + relatório semanal).
- **Dados mock no canônico** (W58/W59/W60, sessão 9): seed de empresa + colaboradores + folha aplicado ao vivo na
  empresa sintética do canônico (CNPJ `00000000000191`), com aval do dono para validação de design; limpeza via
  `e2e/cleanup/seed-cleanup.spec.ts`. Não tratar como dado real.
- **Secrets obsoletos** (W29, PR #247): os identificadores públicos `VITE_SUPABASE_*` (URL + chave anon, 12
  ocorrências) migraram de `secrets` para `vars`; o dono deve apagar os secrets de repositório antigos.

## Pendências recomendadas (19/10/2026)

- Curto prazo: revisar `infra/runbooks/BRIDGE_PERFORMANCE.md`; query timeout no bridge (AbortController);
  keyset pagination para tabelas >100K; CSP headers no nginx.
- Médio prazo: revisar `any` restantes (`grep -rn ": any" src/`); testes unitários do bridge; cache para
  tabelas estáticas; read replicas para queries analíticas.
