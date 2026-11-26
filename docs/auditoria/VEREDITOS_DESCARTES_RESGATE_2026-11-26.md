# Vereditos dos descartes do resgate — 2026-11-26

Registro das decisoes tomadas ao comparar a `main` com as branches de resgate do
port do agente Muri, para que **nenhum agente futuro tente resgatar de novo** o
que aqui foi decidido. Cada item traz a prova que sustenta o descarte.

## 1. Docs normativas indevidamente descartadas — RESGATADAS

Tres documentos **citados por codigo da `main`** nunca existiram nela. Foram
restaurados byte a byte na PR #912:

| Documento | Linhas | Citado por |
| --- | --- | --- |
| `docs/motion-regua-global.md` | 459 | `ui/revelacaoGrafico.tsx:61`, `ui/entradaGlobal.ts:15` (§8), `recrutamento/animacaoDetalheVaga.ts:25,44` (§2, §3), `banco-horas/CabecalhoBancoHoras.tsx:94` |
| `docs/ESCALA-GLOBAL-DESIGN-SYSTEM.md` | 72 | `horas-extras/HorasExtrasKpis.tsx:22`, `horas-extras/horasExtrasComum.ts:96` |
| `docs/tooltips-graficos.md` | 122 | card de departamentos (tooltip HTML/CSS, nao Recharts) |

Esses 3 **nao** entram na regra dos outros 42 docs orfaos: aqueles sao
redundantes (`docs/api/*` duplicando `MAPA_API.md`; ADRs renomeados de
`001-stack` para `0001-stack`), estes sao fonte normativa com referencia de
secao.

## 2. E2E que existem so nas branches — NAO portados

### 2.1 `e2e/authenticated/ninebox-aprovacao.spec.ts` (85 linhas)

Contrato interessante: T1–T7 (aprovacao do gestor classifica direto no Nine-Box,
sem etapa posterior de validacao do RH; persiste apos F5). Todos os seletores
existem na `main` (`cartao-feedback`, "Segmentar por tipo de feedback",
"Aprovar avaliacao", "Matriz Nine-Box", botao `Estrela — N colaborador`).

Motivo do descarte:

- O codigo do fluxo e **identico** na `main` e na branch
  (`NineBoxFocoBanner.tsx`, `motorAvaliacao360.ts` e `nineBoxMock.ts` nao diferem
  exceto por comentario) — nao ha funcionalidade a recuperar.
- A `main` ja tem **11 suites Jest de Nine-Box**, entre elas
  `NineBoxAprovacaoIntegracao.test.tsx` — que cobre exatamente o contrato
  "aprovacao do gestor -> classificacao" em nivel de componente. O e2e seria a
  primeira cobertura de browser, mas `playwright.config.ts:26` usa `retries: 0`
  em PR: uma especificacao instavel passaria a derrubar **todo PR do
  repositorio**.
- Depende de estado demonstrativo (`dp-desempenho-demo-registros`) e de
  `Ana Beatriz Souza` ter feedback demonstrativo para aprovar; em
  `src/mocks/desempenhoMock.ts` ela **nao** aparece. A premissa nao se sustenta
  estaticamente.

O que tornaria o item portavel: semear explicitamente o estado demo no proprio
teste e trocar as pausas por assercao de um elemento concreto.

### 2.2 `e2e/authenticated/premiacoes-auditoria.spec.ts` (66 linhas)

Depende de `VITE_PREMIACOES_MOCK`, que tem **0 ocorrencias** na `main`, e de
`src/mocks/premiacoesMock.ts` (275 linhas, tambem so na branch). A tela existe e
tem teste unitario (`PremiacoesPage.tsx` + `PremiacoesPage.test.tsx`), ou seja
**nao e funcionalidade perdida**: e um arranjo de demonstracao que a `main`
substituiu por dados reais.

## 3. Seletor "Ciclo em visao" no Nine-Box — SUPERADO

A branch adiciona um `Select` de ciclo dentro de `NineBoxFiltros` e o fio
`onCicloId={setCicloSelecionadoId}` em `AvaliacaoPage.tsx`. A `main` ja tem esse
controle no **cabecalho da pagina**, mais completo: `cicloSelecionadoId`,
`seletorCiclosAberto` e a acao administrativa de excluir/ocultar ciclo
(`[data-acao-ciclo]`, `podeExcluirCiclos`, `AvaliacaoPage.tsx:124-131,210-211`).
Portar criaria **dois controles para o mesmo estado**.

## 4. Codigo sem consumidor nem na propria branch — MORTO

- `src/hooks/useActionStateHelper.ts` (111 linhas): unica mencao na branch e um
  comentario em `src/hooks/validators.ts:2`; nenhum import.
- `src/hooks/useCalculoFeriasPreview.ts` (34 linhas): nenhum import na branch.
- `src/hooks/useFeriasCursor.ts` (104 linhas): unico consumidor e
  `src/types/pagination.ts`, tambem so da branch.

## 5. Camada de mocks/fixtures da branch (~8.500 linhas) — NAO portada

`admissoesMock.ts` (1253), `gestaoMock/*` (2491), `layoutMock/*` (1749),
`desligamentosMock.ts` (825), `recrutamentoMock.ts` (569), `feriasPeriodosAquisitivosMock.ts`
(304), `premiacoesMock.ts` (275), `auditoriaMock.ts` (368), `calculadoraRescisaoMock.ts`
(145), `dashboardMockData.ts` (141), `pontoFluxoMock.ts` (90).

A `main` consome **outros** fixtures (`colaboradoresMock.ts`, `desempenhoMock.ts`)
e mescla com o banco real via `mesclar(...)`. Portar essa camada substituiria
dados reais por fixture — regressao.