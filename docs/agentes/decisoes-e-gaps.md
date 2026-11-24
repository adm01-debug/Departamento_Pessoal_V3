# Decisões técnicas e gaps conhecidos

Ler quando for propor mudança de stack, dependência, build ou bridge — e antes de "consertar" algo que pode ser
decisão tomada. Resumo na seção 8 do `AGENTS.md`; aqui está o detalhe.

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

## Aberto com o dono — teto da margem consignável (19/11/2026)

Três tetos diferentes convivem no sistema e nenhum deles cita a fonte legal escolhida:

| Onde | Teto | Base |
| --- | --- | --- |
| `src/components/descontos/NewLoanDialog.tsx` (`MARGEM_CONSIGNAVEL_TELA`) | 30% | `colaboradores.salario_base` |
| `supabase/migrations/20261118235000_consignado_margem_consignavel_trigger.sql` | 35% | `colaboradores.salario_base` |
| `src/calculators/rescisao.ts:157` e `beneficios` | 35% | salário **líquido** |

Hoje não há perda de função: a tela é a mais restritiva, então ela nunca libera o que o trigger recusa — o
trigger é só o backstop de quem escreve direto na tabela, sem passar pela tela. O teste
`NewLoanDialog.test.tsx` trava esse par (teto da tela <= teto do banco) e confere que o espelho do teto do
banco acompanha o arquivo da migration.

**Decisão do dono:** qual é o teto oficial do consignado e sobre qual base. A Lei 10.820 (com a redação da
14.431/2022) trabalha com 35% no total, sendo a faixa de empréstimo menor que o total e o restante reservado
ao cartão consignado — por isso 30% e 35% aparecem juntos na literatura. Escolhido o número e a base, a
correção é de uma linha em cada um dos três pontos acima, mais o `.verify.sql` do trigger.

## Aberto com o dono — E2E autenticado vermelho na main desde 18/11/2026

Issue #667 acumula 48 comentários automáticos do CI sem nenhum diagnóstico. O run 44436569279 fecha em
**76 passaram, 11 falharam**, e as 11 têm uma causa só: a empresa da sessão E2E não tem os dados que os
specs leem.

| Medição em 19/11/2026 (MCP do Supabase) | Resultado |
| --- | --- |
| `empresas` | 2: `66104399…` TIME PROMO BRINDES (CNPJ `00000000000100`) e `61e7d382…` "E2E SEED LTDA — NAO USAR EM PRODUCAO" (CNPJ `00000000000191`) |
| `user_empresas` com `is_default` na empresa de seed | só `ed8ba796…` e `7d2cba38…`, criados em 15/10/2026 16:15 junto com a empresa — as contas do E2E |
| `feedbacks_360` | 6 linhas, **todas** em `66104399…` |
| `ciclos_avaliacao` | 5 linhas, **todas** em `66104399…` |
| `candidatos` | 5 linhas, **todos** em `66104399…` |

A empresa de seed tem **zero** ciclo, **zero** feedback 360 e **zero** candidato. Daí as duas cadeias de
falha:

- `/avaliacao` → a aba Feedbacks não renderiza card nenhum, então
  `expect(getByText('Avaliado por').first()).toBeVisible()` estoura em 15 s no helper compartilhado
  (`e2e/authenticated/feedbacks-padronizacao.spec.ts:38` e `feedbacks-historico.spec.ts:20`) — 9 falhas
  (`feedbacks-padronizacao` ×4, `feedbacks-historico` ×1, `layout-protegido-desempenho` ×4).
- `/recrutamento` → `[data-candidato-card]` nunca aparece (`recrutamento-pipeline.spec.ts:28`) — 2 falhas
  (`recrutamento-pipeline`, `recrutamento-pipeline-animacao`).

**Não é funcionalidade perdida nem regressão de código.** A coluna existe
(`src/components/avaliacao/CartaoFeedbackCanonico.tsx:333`, com a largura de 216 px que o spec de layout
cobra) e o teste unitário dela passa (`FeedbackPadronizacao.test.tsx`). O seed de W58/W59/W60 criou empresa,
colaboradores e folha, mas nunca criou ciclo, feedback 360 nem candidato — e os specs que leem esses três
ficaram na suíte.

**Decisão do dono**, porque as duas saídas têm custo diferente:

1. **Completar o seed** da empresa sintética com um ciclo, os feedbacks 360 nos estados que os specs cobram
   (normal, fila do gestor, cancelado com justificativa) e 5 candidatos nas 5 etapas. Barato, mas grava dado
   no banco canônico de produção — ainda que na empresa marcada "NAO USAR EM PRODUCAO".
2. **Tornar os specs autossuficientes**, criando e derrubando o próprio dado em `beforeAll`/`afterAll`. É o
   certo a longo prazo e acaba com a dependência de dado posto à mão, mas é reescrita dos 5 arquivos e grava
   em produção a cada run do CI de qualquer jeito.

Não dá para verificar nenhuma das duas neste container: a suíte autenticada precisa dos segredos
`E2E_USER_*` e do Supabase real. Enquanto isso o `Playwright E2E` segue vermelho na `main` e **não é check
obrigatório** — o merge não trava, mas nenhum teste de ponta a ponta protege o sistema.
