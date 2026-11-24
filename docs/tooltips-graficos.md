# Tooltips dos gráficos (Recharts) — posição direta, entrada só por opacidade

Documento de referência do comportamento dos tooltips de **todos** os gráficos do
sistema. Complementa `docs/motion-regua-global.md` (ritmo global) — aqui o
assunto é **posicionamento**.

## 1. O defeito (causa raiz)

O Recharts posiciona a tooltip por `transform: translate(x, y)` no wrapper
`.recharts-tooltip-wrapper` e, com `isAnimationActive` (padrão `'auto'`), injeta
`transition: transform 400ms ease` nesse wrapper
(`node_modules/recharts/es6/component/TooltipBoundingBox.js` →
`resolveTransitionProperty`).

Como a posição só é conhecida **depois** da primeira medição do conteúdo, a
tooltip nascia na origem/anterior (canto do gráfico ou último ponto ativo) e
**deslizava** até o ponto do mouse — a cada troca de ponto, de novo. Era o
"aparece na lateral e voa até o cursor" reportado.

Não era (só) duração: era uma transição de `transform` animando a POSIÇÃO.

## 2. A régua (fonte única)

| Camada                   | Arquivo                                | O que define                                                                                                                                 |
| ------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Componente compartilhado | `src/components/ui/tooltipGrafico.tsx` | `<TooltipGrafico>` (substituto direto do `<Tooltip>` do Recharts) + `CLASSE_ENTRADA_TOOLTIP` + `ConteudoTooltipGrafico`                      |
| Token/CSS                | `src/index.css`                        | `--transition-duration-tooltip: 150ms`, `@keyframes tooltipGraficoFade`, `.tooltip-grafico-entrada` e o override em `prefers-reduced-motion` |

O que o componente faz:

1. `isAnimationActive={false}` → o Recharts **para de interpolar o `translate`**;
   a posição final (com `offset` de 10px, limites do `viewBox` e troca de lado
   quando não cabe) é aplicada direto, **antes** de a tooltip aparecer.
2. Mantém o conteúdo padrão (`DefaultTooltipContent`), agora envolvido por um
   bloco que só monta com o ponto ativo → o fade roda **uma vez por aparição**,
   nunca a cada troca de ponto.
3. Fade = **só opacidade** (0 → 1, 150ms, `ease-out`). Sem `translate`, sem
   escala, sem spring, sem bounce.
4. Repassa todas as props (`contentStyle`, `formatter`, `labelFormatter`,
   `cursor`, `wrapperStyle`, `content`…) sem alterar nada do gráfico.

## 3. Gráficos cobertos

38 tooltips em 18 arquivos usam `<TooltipGrafico>`:

`TelemetryCharts` (4), `AdmissoesDashboard` (1), `BeneficiosDashboard` (2),
`HeadcountOverviewCard` (1 — "Visão Geral da Empresa"), `TurnoverChart` (1),
`FeriasDashboard` (2), `FolhaDashboard` (3), `MetabaseEmbed` (4),
`GestaoPontoAnalytics` (1), `PontoCharts` (2),
`RewardsSimulator` (2), `AnalyticsEvolucao` (1), `RelatoriosAnalyticsTab` (4),
`SSTExamesTab` (2), `AfastamentosPage` (1), `DashboardExecutivoPage` (4),
`PassivoTrabalhistaPage` (2), `ProvisoesPage` (1).

Conteúdo próprio (tooltip customizada) recebe a **mesma** entrada via
`CLASSE_ENTRADA_TOOLTIP` no elemento raiz: `TurnoverChart`,
`AnalyticsEvolucao`, `RewardsSimulator` (`TooltipCascata`/`TooltipSerie`),
`DashboardExecutivoPage`, `PassivoTrabalhistaPage`.

**Fora do escopo (por decisão):** os tooltips de UI do Radix
(`src/components/ui/tooltip.tsx`) usados em elementos de gráfico
(`EpiCategoryChart`, `NineBoxMatriz`). Eles são ancorados no elemento (não
seguem o mouse) e o `animate-in … slide-in-from-*` é a linguagem de motion do
Design System para **todo** tooltip da interface — mudá-la aqui mudaria também
as telas sem gráfico, e o Nine-Box está na área protegida de Gestão de
Desempenho.

#### Dica ancorada na barra — `Fluxo de Entradas por Horário`

`src/components/ponto/PontoFluxoEntradasDica.tsx` é o único tooltip de gráfico
que **não** é do Recharts: o gráfico de barras do card é desenhado em HTML/CSS
(as colunas crescem por variável CSS, ver `ui/crescimentoBarras.ts`), então não
existe `Tooltip` de Recharts ali.

| Item               | Valor                                                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Posição            | calculada em `useLayoutEffect` a partir de `getBoundingClientRect` da coluna, da barra e do plot; presa dentro do plot nos dois eixos (`left`/`top` escritos direto no DOM, sem estado extra) |
| Entrada            | fade + **4 px de subida**, 150 ms, `easeOut` (mesmo `--transition-duration-tooltip`)                                                                                                          |
| Conteúdo           | intervalo da hora (`08:00 – 08:59`), entradas registradas, participação no total (derivada da série exibida) e a marca de pico                                                                |
| Movimento reduzido | caixa aparece pronta (`initial={false}`, duração 0)                                                                                                                                           |

Por que o deslocamento vertical não reabre o defeito descrito acima: a posição é
resolvida **antes** da exibição e não é interpolada — o ponteiro não é
perseguido por um `translate` animado, como acontecia no wrapper do Recharts. O
fade + 4 px é entrada, não movimento até o cursor.

#### Dica ancorada na coluna — `Distribuição por Distância` (Geofencing)

`src/components/ponto/PontoGeoDistancia.tsx` segue o mesmo idioma do item acima
(o gráfico também é HTML/CSS, com `useCrescimentoBarras`): `indiceAtivo` diz
QUAL coluna está sob o ponteiro, a geometria vem de `getBoundingClientRect`
(coluna, `[data-barra]` e plot) dentro de um `useLayoutEffect` e é aplicada por
`style` antes do primeiro quadro pintado. A caixa é centralizada na coluna,
sobe 6 px acima do topo da barra, é presa nas duas bordas do gráfico e não
desloca nenhuma coluna (`absolute` + `pointer-events-none`). Entrada fade + 4 px
(150 ms, `easeOut`); a SAÍDA é o fade do `AnimatePresence`, e trocar de coluna
apenas troca o texto no lugar — sem remontar e sem reanimar.

## 4. Como validar

```bash
npx vitest run src/components/__tests__/TooltipGraficoRegua.test.tsx
```

O teste trava: `isAnimationActive={false}`, props repassadas, conteúdo padrão
montando só com ponto ativo, o fade de 150ms apenas em opacidade, o override de
movimento reduzido e a adesão dos 19 arquivos (40 tooltips, nenhum `<Tooltip>`
cru do Recharts).

Validação no navegador (medida quadro a quadro em 15 gráficos — área, linha,
barra, pizza/rosca, dispersão, com conteúdo padrão e customizado, em
1024/1280/1440/1920 px):

- tooltip aparece em **1 posição**, com **0 frames intermediários**, tanto na
  entrada quanto ao trocar de ponto (`transition: all 0s` no wrapper);
- religando `transition: transform 400ms ease` no wrapper, os mesmos gráficos
  passam a mostrar **6–21 frames** de deslizamento — prova de que a causa era
  essa transição;
- entrada medida: `tooltipGraficoFade 0.15s`, `transform: none`, opacidade
  0 → 0,18 → 0,34 → … → 1 em ~9 frames;
- `prefers-reduced-motion: reduce`: `animation: none`, opacidade 1 imediata.

![Tooltip do card "Visão Geral da Empresa" aberta em Jul/26, já na posição final](./tooltips-graficos-dashboard.png)
