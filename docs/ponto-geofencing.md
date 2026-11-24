# Painel de Geofencing (Controle de Ponto → Gestão da Equipe → Geofencing)

Documento curto de referência para quem for manter a área: de onde vêm os
números, o que é mocado, qual biblioteca desenha o mapa e quais réguas do
Design System foram reaproveitadas.

## Arquivos

| Arquivo                                          | Papel                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `src/components/ponto/PontoGeofencingPainel.tsx` | orquestra período, camadas, KPIs, mapa e cards                      |
| `src/components/ponto/PontoGeoMapa.tsx`          | mapa Leaflet (bases, perímetro, marcadores, calor, controles, dica) |
| `src/components/ponto/PontoGeoDistancia.tsx`     | barras por faixa de distância                                       |
| `src/components/ponto/PontoGeoRegistros.tsx`     | tabela de registros recentes + janela "Ver todos"                   |
| `src/utils/pontoGeofencing.ts`                   | derivações puras (Haversine, faixas, resumo, períodos)              |
| `src/hooks/usePontoGeofencing.ts`                | consultas do período, do período anterior, da unidade e do raio     |
| `src/mocks/pontoGeoMock.ts`                      | vitrine demonstrativa (só em DEV + `VITE_PONTO_MOCK=true`)          |

## Dados

- **Batidas**: `batidas_ponto` do período selecionado (`data` entre `inicio` e
  `fim`), com o colaborador embutido (`listarPorPeriodo`).
- **Período anterior**: mesma janela, imediatamente antes — base do indicador de
  variação dos KPIs (`variacaoPercentual`). Sem base, o indicador é omitido.
- **Unidade**: `locais_trabalho.latitude/longitude` (primeiro local ativo com
  coordenada).
- **Raio**: `configuracoes_ponto.raio_maximo_metros`, com o MESMO fallback do
  registro de ponto (`200`).
- **Distância**: a coluna `distancia_local_metros` quando existir; no caso
  normal (o RPC `registrar_batida_ponto` não a preenche) é a distância
  geodésica calculada por Haversine — a mesma fórmula de `pontoService`.
- **Situação**: `distancia <= raio` (recalculada, para o marcador concordar com
  o círculo desenhado do raio atual).

KPIs, mapa, gráfico de distância e tabela leem a MESMA lista de pontos: mudar o
período muda uma única série.

## Mapa

- Biblioteca: **Leaflet 1.9.4** (sem chave de API), usada de forma imperativa.
- Bases: OpenStreetMap (escurecido por filtro CSS) e Esri World Imagery
  (satélite). CARTO `basemaps.cartocdn.com` foi descartado — responde 403/“API
  key required” no navegador.
- Ajuste fino de produção: trocar por um provider com chave (MapTiler, Stadia,
  Thunderforest) alterando `BASES` em `PontoGeoMapa.tsx` e o filtro em
  `src/index.css`.
- Armadilhas já resolvidas (não reintroduzir):
  - `preferCanvas: false` — o canvas do Leaflet cobre o mapa e intercepta o
    ponteiro;
  - `.geo-mapa .leaflet-tile { max-width: none }` — o preflight do Tailwind zera
    a largura dos tiles e o mapa fica sem base;
  - créditos do Leaflet com **duas** classes (`.geo-mapa .leaflet-container …`):
    o `leaflet.css` entra depois de `src/index.css` no bundle e, com a mesma
    especificidade, a barra de atribuição ficava **branca** em cima do mapa.

### Contraste sobre o mapa

Controles flutuantes (zoom, centralizar, ajustar) e legendas do rodapé usam a
mesma pele (`PELE_SOBRE_MAPA` em `PontoGeoMapa.tsx`): superfície
`bg-background/95` + `backdrop-blur-md`, borda `border-muted-foreground/25`
(o `--border` do tema escuro é escuro demais para separar do tile), sombra curta
e `transition-colors duration-200` no hover. Créditos e escala levam o mesmo
tratamento em `src/index.css`. Nada de legenda solta sobre o mapa sem
superfície — os valores das legendas não mudam.

## Filtros do card do mapa

Período, datas do período personalizado, "Camadas" e os três modos de
visualização ficam na MESMA altura (`h-9`, a altura padrão dos controles do
Design System — ~45px com o root do app a 125%) e com `px-3.5` de respiro.

- **Período**: ícone + texto + chevron em linha única. O ícone e o texto vão
  dentro de um `div` (não de um `span`): o `SelectTrigger` aplica
  `[&>span]:line-clamp-1`, que grava `display: -webkit-box` no filho DIRETO e
  empilhava o calendário acima do texto. `whitespace-nowrap` no trigger garante
  que "Período personalizado" (o rótulo mais longo) continue em uma linha.
- **Modos**: `h-9 px-3` (área clicável maior), lime (`bg-primary`) no estado
  selecionado e `transition-colors duration-200` na troca. Em telas estreitas o
  `flex-wrap` do cabeçalho reorganiza os controles sem quebrar o conteúdo
  interno (testado a 1100px, 1440px e 1600px, sem rolagem horizontal).

## Colunas do gráfico de distância

As cinco colunas seguem o desenho do card **"2. Visualize o impacto"**
(`premiacoes/RewardsSimulator.tsx`), que é a régua do sistema para barras
verticais: lá o `<Cell>` usa `fill={contorno}` + `fillOpacity={0.2}` +
`stroke={contorno}` `strokeWidth={1.5}` e `radius={[6, 6, 0, 0]}`. Aqui o mesmo
par vira borda + fundo do MESMO token (`CORES_FAIXA` em
`PontoGeoDistancia.tsx`), com `rounded-t-[6px]` e base reta sobre a linha do
zero — nada de preenchimento sólido, sombra ou brilho.

| Faixa         | Contorno + preenchimento                               |
| ------------- | ------------------------------------------------------ |
| 0 – 50 m      | `border-success` + `bg-success/20`                     |
| 50 – 100 m    | `border-primary` + `bg-primary/20`                     |
| 100 – 150 m   | `border-info` + `bg-info/20`                           |
| 150 – 200 m   | `border-xp` + `bg-xp/20`                               |
| acima do raio | `border-destructive-vivid` + `bg-destructive-vivid/20` |

- **Valor acima da coluna**: uma faixa fixa de 18px no topo do plot guarda o
  número (`text-[10.5px] font-semibold`, `tabular-nums`). O espaçamento até a
  barra é sempre o mesmo e o valor nunca escapa da área do gráfico; a grade e
  o eixo Y começam exatamente abaixo dessa faixa (`top-[18px]` / `pt-[18px]`),
  então barras, linhas e rótulos continuam na mesma escala.
- **Realce do hover**: `group` + `group-hover` sobem o preenchimento de 20%
  para 30% (CSS puro); o estado `indiceAtivo` em JS serve só à dica.
- **Faixa vazia** não desenha barra (um contorno de 1,5px sobre o eixo viraria
  uma linha falsa) — o zero continua escrito acima da coluna.

## Movimento (réguas do sistema)

| Elemento              | Régua                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| KPIs                  | `MetricCard` (`entradaCardGlobal`: 14px / 520ms / 120ms)                              |
| Barra de conformidade | `propsPreenchimentoBarra` (1200ms, ease-out, `reduzir` respeitado)                    |
| Barras de distância   | `useCrescimentoBarras` + `estiloCrescimentoBarra` (900ms/100ms, ease-in-out senoidal) |
| Dica de distância     | fade + 4px (150ms, ease-out) + saída pelo `AnimatePresence`                           |
| Linhas da tabela      | `linhaTabelaVariants` (Candidatos)                                                    |
| Modal "Ver todos"     | `CascadeDialogFrame` + `CASCADE_SAIDA_RAPIDA` (Pendências)                            |
| Marcadores            | `@keyframes geoMarcadorEntrada` (260ms, guarda `html:not(.dp-force-motion)`)          |
| Dica do marcador      | fade + 4px (150ms, ease-out) — igual a `DicaFluxoEntradas`                            |

## Dica do gráfico de distância

A caixa é ancorada na COLUNA ativa: `indiceAtivo` guarda só qual coluna está sob
o ponteiro e a geometria sai de `getBoundingClientRect` (coluna, barra e plot)
dentro de um `useLayoutEffect`, aplicada por `style` antes do primeiro quadro
pintado — o mesmo idioma de `DicaFluxoEntradas`/`GestaoPontoAnalytics`.
Centraliza na coluna, sobe 6px acima do topo da barra e é presa nos dois eixos
para nunca sair do gráfico. Passar de uma coluna para outra troca só o texto no
lugar (sem remontar e sem reanimar) e as colunas nunca se deslocam: a caixa é
`absolute` + `pointer-events-none`, fora do fluxo das barras.

## Vitrine demonstrativa

`src/mocks/pontoGeoMock.ts` só entra quando o período NÃO tem nenhum registro e
`VITE_PONTO_MOCK=true` em DEV. O painel exibe o selo **Demonstração** no
cabeçalho do mapa — as duas fontes nunca se misturam. A série é calibrada para
bater com a referência aprovada: 27 batidas em 7 dias, 0 fora do raio, média de
29 m, faixas 8/12/5/2 e variações +8% / +8% / 0% / −12% (todas derivadas, não
digitadas).

### Distribuição por distância (mock de layout)

Com `VITE_LAYOUT_MOCK=true`, as batidas vêm de `layoutMock/dados.ts`
(`batidas_ponto`). A coluna `distancia_local_metros` sai de
`DISTANCIAS_GEO_DEMO` — 99 valores fixos, repartidos de propósito entre as
cinco faixas de 50 m de um raio de 200 m:

| Faixa          | Registros |
| -------------- | --------: |
| 0 – 50 m       |        48 |
| 50 – 100 m     |        27 |
| 100 – 150 m    |        14 |
| 150 – 200 m    |         7 |
| acima de 200 m |         3 |
| **Total**      |    **99** |

A coordenada de cada batida é derivada da MESMA distância (`coordenadaDaBatida`,
projeção metros → graus), então o marcador do mapa cai onde o número manda; e
como `montarPontos` recalcula `dentroRaio` pela distância, mapa, KPIs,
conformidade (96 conformes / 3 irregulares = 97%), gráfico e tabela contam a
mesma história. São dados **exclusivamente demonstrativos** (as escritas seguem
bloqueadas) e não tocam nenhuma série real.

## Testes

- `src/utils/__tests__/pontoGeofencing.test.ts` — matemática, faixas, períodos e
  paridade da vitrine.
- `src/components/__tests__/PontoGeofencingPainel.test.tsx` — KPIs, conformidade,
  faixas, tabela, raio entregue ao mapa e a dica que segue a coluna ativa
  (conteúdo troca no lugar e fecha ao sair do gráfico).
- `src/components/__tests__/PontoGeoDistancia.test.tsx` — colunas vazadas
  (contorno + 20% por faixa), valor acima da coluna certa e faixa sem registro
  sem barra falsa.
- `src/mocks/__tests__/pontoGeoDistribuicao.test.ts` — calibragem da vitrine de
  `layoutMock` (99 registros em 48/27/14/7/3 e 3 fora do raio).
- `src/components/__tests__/PontoGeoEstrutura.test.ts` — contrato de estrutura
  (source-parity): componentes reaproveitados e armadilhas que não podem voltar.
