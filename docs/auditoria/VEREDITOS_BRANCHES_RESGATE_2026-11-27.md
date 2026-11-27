# Veredito das branches restantes — auditoria byte a byte (2026-11-27)

Continuação de `docs/auditoria/VEREDITOS_DESCARTES_RESGATE_2026-11-26.md`.
Fecha a pergunta "sobrou trabalho de outro agente fora da `main`?" com prova
mecânica, não com leitura de nome de branch nem de mensagem de commit.

## Método

Para cada branch, contra `origin/main` (`61fc8ae30`):

| rótulo       | teste aplicado                                           | significa                            |
| ------------ | -------------------------------------------------------- | ------------------------------------ |
| `IGUAL`      | `git rev-parse main:<f>` == `git rev-parse <branch>:<f>` | blob idêntico — já incorporado       |
| `DIFERE`     | arquivo existe nas duas, blobs diferentes                | precisa de leitura do diff           |
| `AUSENTE`    | `git cat-file -e main:<f>` falha                         | conteúdo exclusivo da branch         |
| `CONSUMIDOR` | algum import da `main` pede esse módulo                  | ausente **e** necessário ⇒ regressão |

Regra de corte: arquivo `AUSENTE` **sem** consumidor na `main` é funcionalidade
que nunca foi ligada — não é regressão resgatar ou não resgatar; é código morto
do agente anterior.

Prova complementar de que nada ausente é necessário: a `main` `61fc8ae30` está
com `Continuous Integration & Delivery`, `E2E Tests (Playwright)`,
`Security Scan & Code Quality`, `Gitleaks` e `Post-deploy smoke` em `success`
(runs de 2026-11-26T23:52Z). Se algum import da `main` apontasse para arquivo
inexistente, esse pipeline não fecharia verde.

## Resultado por branch

| branch                                                 | src na branch | `AUSENTE` na main | `AUSENTE` **com consumidor** | veredito                                                           |
| ------------------------------------------------------ | ------------- | ----------------- | ---------------------------- | ------------------------------------------------------------------ |
| `claude/chore-preserva-stash-muri-261124`              | 961           | 135               | 0                            | snapshot de stash — nada necessário                                |
| `claude/chore-preserva-wip-medicao-muri-261124-1715`   | 489           | 122               | 0                            | snapshot de medição — nada necessário                              |
| `claude/feat-integracao-muri-3way-261125-0030`         | 1469          | 115               | 0                            | **fonte do resgate deste PR** (pílula do alternador)               |
| `claude/feat-integracao-trabalho-muri-261124-1501`     | 275           | 115               | 0                            | **fonte do resgate deste PR** (teste da dobra)                     |
| `claude/feat-resgata-trabalho-muri-261124-1400`        | 961           | 135               | 0                            | mesmo snapshot de stash, sem consumidor                            |
| `claude/feat-resgata-ui-muri-261124-1246`              | 313           | 131               | 0                            | snapshot de UI, sem consumidor                                     |
| `claude/feat-lote-aditivo-observabilidade-261124-1215` | —             | 0                 | 0                            | superada: 8 arquivos `IGUAL` e 2 `DIFERE` com a **main mais nova** |
| `claude/feat-ponto-utils-resgate-261125-0100`          | 119           | 46                | 0                            | ver abaixo                                                         |
| `automation/inventario-estado`                         | 0             | 0                 | 0                            | inventário automático, nenhum código                               |
| `contexto`                                             | —             | —                 | —                            | gerada por `.github/workflows/contexto.yml:407` em branch própria  |

### `claude/feat-lote-aditivo-observabilidade-261124-1215`

10 arquivos comparados: 8 `IGUAL`. Os 2 `DIFERE` são o **lado da main mais
recente e mais defensivo**:

- `20260719170000_security_indexes_constraints.verify.sql` — a main cobra o
  índice `idx_rate_limit_logs_expires` só quando a coluna existe
  (`information_schema.columns`); a branch exige o índice sempre e falharia no
  validate do canônico, onde a coluna não existe.
- `20260725100000_p3_060_backup_logs.sql` — a main envolve o `INSERT` em
  `DO $$ ... IF to_regclass('public.config_retencao') IS NOT NULL`; a branch
  faz o `INSERT` direto, que quebra quando a tabela ainda não foi criada.

Não há trabalho perdido: a branch é a versão anterior dos dois arquivos.

### `claude/feat-ponto-utils-resgate-261125-0100`

119 arquivos em `src/`: **71 `IGUAL`** (já na main, inclusive os 30 de
`src/components/turnos/` e o `turnoService`), 4 `DIFERE` e 46 `AUSENTE` — nenhum
dos 46 tem consumidor na main. Dos 46, **17 não têm consumidor nem dentro da
própria branch**: `folhaCompleta`, `rescisaoView`, `arcoDonutMotion`,
`novaVagaRascunho`, `useActionStateHelper`, `useCalculoFeriasPreview`,
`useFeriasCursor`, `detectorReactDuplicado`, `functionsUrl`, `pontoFluxoMock`,
`automacaoService`, `cnabLayoutService`, `dominioService`,
`dominioAlterdataService`, `provisoesService`, `metabaseService` e os mocks
`gestaoMock/*` e `layoutMock/*`. Os 2 restantes (`esocialEventosPeriodicos`,
`esocialEventosSST`) só são importados por um teste da própria branch. Código
escrito, nunca ligado.

Os 4 `DIFERE` são anteriores à main: `horasExtrasComum.test.ts` (a main tem a
asserção com lookahead `(?![/\w-])` documentada) e `barraAdesaoAnim.ts` (a main
usa `avaliacao/barraProgressoAnim`; a branch usa `ui/progressMotion`) — troca sem
ganho funcional.

## O que este PR resgata

1. `src/components/colaboradores/ColaboradorViewSwitcher.tsx` — a pílula
   deslizante (`layoutId` + mola 380/30/0,8, `LayoutGroup` escopado por
   `useId()`, camadas `z-0`/`z-10`, `prefers-reduced-motion` via
   `useMovimentoReduzido`). A main tinha a versão de destaque estático. Fonte:
   `feat-integracao-muri-3way-261125-0030`.
2. `src/components/__tests__/ColaboradorViewSwitcher.test.tsx` — 7 asserções de
   DOM + 3 de fonte que travam exatamente os parâmetros acima. Só existe na
   `3way`, onde o componente com pílula também existe; nas demais branches o
   teste aparece ao lado do componente **antigo**, e falharia.
3. `src/components/recrutamento/__tests__/animacaoDetalheVaga.test.ts` — 6
   asserções sobre `variantesDetalheVaga`, hoje **sem teste na main** embora o
   módulo seja consumido por `src/components/recrutamento/DesempenhoVagasDialog.tsx`.
   Os exports conferidos na main batem, um a um, com as constantes exigidas
   pelo teste.

Verificação: `npx vitest run` nos dois arquivos ⇒ **2 arquivos, 16 testes
passando**; `npx eslint` no componente ⇒ 0 erro.

## Caminhos citados pelo código e ausentes da main

Varredura `git grep -oh -E '(docs|scripts|supabase)/[A-Za-z0-9._/-]+\.(md|json|mjs|ts|tsx|txt|sql)'`
em `src`, `scripts` e `.github` da main: 304 caminhos únicos citados, **84
ausentes**. Todos se explicam por dois padrões, nenhum deles trabalho perdido:

- **fixtures de auto-teste das ferramentas**: `scripts/ai-context/cenarios.mjs:152`
  e `scripts/ai-context/gerar.unit.mjs:69,288` escrevem caminhos falsos de
  propósito (`supabase/functions/t1-fn/`, `supabase/functions/stripe-webhook/`,
  `supabase/migrations/_superseded/...`); `scripts/maintenance/maintenance.unit.mjs:46`
  cria `scripts/gate.mjs` em diretório temporário; `scripts/graphify-local.mjs:597`
  lista `scripts/graphify/extract-code-only.mjs`, que por desenho não é versionado.
- **referência quebrada pré-existente (não é trabalho perdido)**: `scripts/graphify-local.mjs:597`
  executa `scripts/graphify/extract-code-only.mjs`, arquivo que **não existe em
  nenhuma branch nem na main** (a main só tem `scripts/graphify/README.md` e
  `setup.sh`). O caminho `champions` desse script falharia ao rodar; fica
  registrado como pendência, fora do escopo de resgate.
- **árvore de contexto gerada**: `docs/contexto/**` (manifests, `00-INDEX.md`,
  `state.json`) é publicada por `.github/workflows/contexto.yml:407` em
  `refs/heads/$CONTEXTO_BRANCH`, não na `main`.
