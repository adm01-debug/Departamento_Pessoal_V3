# Régua global de motion (durações e curvas)

Documento de referência do ritmo de animação do sistema. Vale para **todo** o
app, exceto a área protegida de Gestão de Desempenho, cujo layout está
congelado (`docs/protegido/DESEMPENHO-LAYOUT-PROTEGIDO.md`) — a régua global
de tempo **não** altera estrutura, cores, espaçamentos nem classes daquela
área.

## 1. Onde a régua mora (fonte única)

| Camada | Arquivo | O que define |
|---|---|---|
| CSS/Tailwind (tokens) | `src/index.css` → bloco `@theme` no topo | `--default-transition-duration`, `--transition-duration-{fast,base,slow,slower}`, `--ease-{standard,entrance,exit}` |
| Utilitários CSS do app | `src/index.css` → `.hover-scale`, `.hover-glow`, `.hover-lift`, charts (`.roi-grafico`) | usam `duration-base` / `var(--transition-duration-fast)` |
| Animações nomeadas do Tailwind | `tailwind.config.js` → `theme.extend.animation` | `fade-in/out`, `scale-in`, `slide-in/out-right`, `accordion-down/up` |
| Presets Framer Motion (overlays) | `src/components/ui/motion-presets.ts` | `DROPDOWN_MOTION` (open/close/item/stagger/chevron) |
| Cascata de overlays grandes | `src/components/ui/cascade-motion.ts` | shell open/close, item in/out, stagger, overlay |
| Transição entre páginas | `src/components/layout/PageTransition.tsx` | `DEFAULT_CONFIG.duration` + mapa por rota |
| Entrada de card (fila única) | `src/components/ui/entradaGlobal.ts` | `CONFIG_ENTRADA_CARD_GLOBAL` (14 px / 520 ms / 120 ms, `ease-out`), `criarVariantesEntradaCard`, mapas de slots; consumido por `ui/entrada-cards.tsx` (todo o sistema) e por `dashboard/MetricCard.tsx` via `animarEntrada` |
| Dobra em linha de tabela (accordion) | `src/components/recrutamento/animacaoDetalheVaga.ts` | altura `0` ↔ `auto` em 300 ms com `ease-standard`, fade do conteúdo e cascata das etapas (ver §11) |

> **Regra prática:** para mudar o ritmo do sistema inteiro, mexa **primeiro** em
> `--default-transition-duration`. Ele governa todo `transition-*` do Tailwind
> escrito **sem** `duration-*` explícito — que é a maioria dos hovers, cards e
> tabelas do app.

## 2. Escala adotada

| Token / classe | Valor | Uso |
|---|---|---|
| `duration-fast` (também `--default-transition-duration`) | **220 ms** | micro-interações: hover, foco, chips, chevrons, fechamento de overlay |
| `duration-base` | **280 ms** | componentes: sombra/elevação, cores de estado, abertura de overlay |
| `duration-slow` | **360 ms** | transições maiores: trilhas, tabelas |
| `duration-slower` | **500 ms** | animações longas (largura de barra, entrada de loader de página) |
| `duration-progresso` | **1200 ms** | **preenchimento de barra de progresso** (ver §5) |

Faixas de referência por tipo de movimento:

| Tipo | Faixa | Exemplos |
|---|---|---|
| Hover / foco | 180–250 ms | `.hover-scale`, botões, chips, links |
| Componente (cor, sombra, borda) | 250–350 ms | cards, inputs, badges |
| Entrada de card / elemento | 350–500 ms | `MetricCard` (400 ms), `fade-in` (420 ms), `scale-in` (380 ms) |
| Página / modal | 350–450 ms | `PageTransition` (420 ms; `/dashboard` 400 ms; `/login` 450 ms) |
| Expandir / recolher | 250–350 ms | `accordion-down` (320 ms) / `accordion-up` (280 ms) |
| Dropdown / select / popover | 220–280 ms | `DROPDOWN_MOTION`: abre 280, fecha 220, item 220, stagger 55, chevron 220 |
| **Preenchimento de barra de progresso** | **1200 ms** | `ui/progress.tsx`, barras `width` em CSS e em Framer Motion |

## 3. Curvas

| Token | `cubic-bezier` | Uso |
|---|---|---|
| `ease-standard` (e também `--default-transition-timing-function`) | `0.4, 0, 0.2, 1` | padrão simétrico (entrada e saída) |
| `ease-entrance` | `0.22, 1, 0.36, 1` | entradas (cards, modais, páginas, `fade-in`) |
| `ease-exit` | `0.4, 0, 1, 1` | saídas |

## 4. Como usar

```tsx
// utilitário Tailwind (preferido)
<div className="transition-shadow duration-base hover:shadow-elevated" />
<div className="transition-transform duration-fast hover:scale-105" />

// curva explícita
<div className="transition-colors duration-base ease-entrance" />

// Framer Motion (mesma faixa, em segundos)
<motion.div transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} />
```

Não use mais durações numéricas soltas (`duration-150`, `duration-300`) em
código novo: elas ignoram a régua. Prefira o token semântico.

## 5. Barras de progresso (preenchimento em 1200 ms)

O preenchimento tem régua própria, bem acima das demais: o olho precisa
**acompanhar** a barra enchendo (`0 → N%`). Antes cada tela tinha o seu tempo
(0,35 s / 0,5 s / 0,6 s / 0,8 s / 1 s / 1,5 s / `duration-slow` /
`duration-slower`), e a maioria passava rápido demais para ser percebida.

| Implementação | Onde | Como é animada |
|---|---|---|
| Componente compartilhado (Radix) | `src/components/ui/progress.tsx` (17 consumidores: eSocial, férias, descontos, SST, portal, workflows, importação, contratação, ponto…) | `transition-all duration-progresso ease-out` no `Indicator`; o valor continua vindo de `value` via `translateX` |
| Barras `width` em CSS | `barra-progresso-preenchimento` + `duration-progresso ease-out` (admissões, onboarding, treinamentos, premiações, dashboard, descontos) | transição de `width` |
| Barras `width` em Framer Motion | `BARRA_PROGRESSO_DURACAO_S` / `BARRA_PROGRESSO_EASE` de `src/components/ui/progressMotion.ts` (dashboard executivo, analytics, folha, SST, ponto, treinamentos, passivo trabalhista…) | `initial={{ width: 0 }} → animate={{ width: '<valor real>%' }}` |

Regras:

* o **valor** nunca vem da régua: a duração só define o tempo até o percentual
  real (`value`, `progresso`, `pct`, `percentual`). Nada é simulado nem
  arredondado para “ficar bonito”;
* a régua padroniza **apenas duração e curva**. Atraso inicial, passo de
  cascata, cor, altura e largura continuam sendo de cada card — é o que
  preserva a coreografia aprovada de cada tela;
* `prefers-reduced-motion`: `.progress-indicator` e
  `.barra-progresso-preenchimento` caem para `transition-duration: 0.01ms`
  (barra já no valor final);
* **Gestão de Desempenho:** a barra do card “Amplitude de Liderança”
  (`DashboardExecutivoPage`) e a barra do módulo
  (`src/components/avaliacao/barraProgressoAnim.ts` → `BARRA_DURACAO_S`) usam a
  mesma constante da régua — as duas foram para 1,2 s com **autorização
  explícita do usuário**, e `DesempenhoBarrasProgresso.test.tsx` continua
  exigindo paridade número por número. Nenhuma outra mudança visual foi feita
  naquela área (o `npm run verificar:layout` segue 100% OK).
* **Analytics de Recrutamento — “Principais origens” e “Desempenho por vaga”:**
  as duas barras que dividem a linha com o texto passaram a crescer com a
  **cascata do card de referência** (`propsPreenchimentoBarraCascata`: 1,2 s,
  `easeOut`, atraso de 0,15 s + 0,1 s por linha), em vez do `span` CSS que
  nascia já cheio. O preenchimento é **um** componente
  (`recrutamento/barraProgressoAnalytics.tsx`), o gradiente é o da plataforma
  em Origens (`GRADIENTES_ORIGEM`) e **um só** no painel de vagas
  (`GRADIENTE_VAGA`), e a varredura só começa depois que a entrada do card
  termina (`useEntradaCardConcluida`) — uma vez por montagem, sem reiniciar em
  hover, tooltip ou troca de filtro. `BarrasProgressoRegua.test.ts` compara os
  números com o **fonte** do card de referência; altura, trilho, cantos,
  espaçamento e percentuais não mudaram.

Cobertura travada por teste: `src/components/__tests__/BarrasProgressoRegua.test.ts`.

## 6. Movimento reduzido

Nada nesta régua desliga o tratamento de `prefers-reduced-motion`:

* `src/index.css` mantém os blocos `@media (prefers-reduced-motion: reduce)`
  (`.animate-squash`, overlays `*-anim`/`*-chevron`, Kanban com crescimento
  curto de 500 ms);
* `src/lib/motionMode.ts` é a fonte única em JS (`useMovimentoReduzido()` /
  `deveReduzirMovimento()`), com override de desenvolvimento (`dp-force-motion`);
* componentes Framer passam `duration: 0` / `staggerChildren: 0` quando o modo
  reduzido está ativo.

## 7. Como validar depois de mexer

```bash
npm run typecheck          # tipos
npm run lint:ci            # eslint (gate de warnings)
npm run build              # garante que os tokens do @theme compilam
npx vitest run src/components/__tests__/OrganogramaToolbar.test.tsx
npx vitest run BarrasProgressoRegua DesempenhoBarrasProgresso
# entrada de card: régua global × área congelada × cabeçalho do Organograma
npx vitest run DashboardEntrada DesempenhoEntradaCascade OrganogramaHeaderReveal
node scripts/verificar-layout-protegido.mjs   # área congelada de Desempenho
```

O build deve conter, no CSS gerado, `--default-transition-duration`,
`--transition-duration-fast`, `--transition-duration-progresso: 1.2s` e
`--default-transition-timing-function: var(--ease-standard)`.

## 8. Entrada de card — régua global de FILA ÚNICA

Fonte única: `src/components/ui/entradaGlobal.ts` →
`CONFIG_ENTRADA_CARD_GLOBAL`.

| Item | Valor |
|---|---|
| `deslocamentoY` | **14 px** (sobe até `y: 0`) |
| `duracaoMs` | **520 ms** por card |
| `intervaloMs` | **120 ms** entre o INÍCIO de um card e o do próximo |
| `curva` | `ease-out` = `cubic-bezier(0, 0, 0.58, 1)` |
| escala / mola | **nenhuma** (sem `scale`, sem `spring`/bounce/overshoot) |
| teto da fila | `MAX_SLOT_ENTRADA_CARD_GLOBAL = 11` (≈ 1,32 s) |

Foi a régua validada no Dashboard Executivo, promovida a padrão do Design
System sem recalibrar nenhum número.

**Fila única.** O `custom` de um card é a POSIÇÃO dele na própria faixa e o
mapa de slots converte posição → instante:

| Mapa | Sequência | Uso |
|---|---|---|
| `slotSequencial` (padrão) | 0, 1, 2, 3, … | qualquer grid/lista de cards |
| `slotKpiIntercalado` | 0, 1, 3, 5, 6, … | tira de KPI Cards que divide a fila com o conteúdo |
| `slotConteudoIntercalado` | 0, 2, 4, 7, 8, 9, … | cards de conteúdo que preenchem os vãos dos KPIs |

O slot 0 é compartilhado de propósito: o 1º card de cada faixa começa no mesmo
frame (é o que faz o Dashboard Executivo ter Headcount + Evolução do Quadro
juntos e o resto em zíper).

**Como adotar em uma tela nova**

```tsx
// 1. KPI Card do design system — o mais automático
<MetricCard animarEntrada indexForCascata={i} … />

// 2. qualquer bloco animado
<motion.div {...propsEntradaGlobal(i)} className="…" />

// 3. ou o pacote já usado por ~40 arquivos (Pesquisas, Treinamentos,
//    Recrutamento, Admissões, Desligamentos, Calculadora de Rescisão…)
<motion.div {...entradaCard(i)} className="…" />
```

**Uma animação por card.** Nenhum bloco INTERNO de um card animado repete a
variante do container: as filhas são `<div>` estruturais (mesmas classes). Caso
contrário os atrasos internos correm enquanto o card pai ainda está invisível —
o "efeito burrow" (corrigido no Dashboard Executivo e na Calculadora de
Rescisão). Exceção legítima: cascatas de diálogo (`cascade-motion.ts`) e itens
de lista cujo índice é MAIOR que o do container (Premiações), que entram depois
do pai e por isso são vistas.

**O que NÃO usa esta régua**

* Nenhuma rota fica de fora desde 29/10/2026. **Gestão de Desempenho**
  (`/avaliacao`) era a exceção declarada: `.clinerules` §1 congela o movimento
  daquela área, então a animação aprovada (`cardVariants`: 20 px / 0,4 s /
  0,08 s, teto no 9º item) ficava fixada em `avaliacao/entradaCards.tsx`
  (`CARD_VARIANTS_CONGELADO`) e o isolamento era por atributo — o `MainLayout`
  escrevia `data-entrada-escopo="desempenho-congelado"` em `#main-content`, e
  esse atributo devolvia à rota o squash original (`index.css`, `squashInSafe`
  0,7 s) e o passo de 60 ms (`use-stagger-cards.ts`).
  Com a autorização explícita do usuário ("aplicar a mesma animação de entrada
  do Dashboard Executivo a todos os cards e KPI cards do módulo Avaliação e
  Performance"), o módulo passou a consumir esta régua: `avaliacao/entradaCards.tsx`
  virou uma **ponte** para `ui/entrada-cards.tsx` (14 px / 520 ms / 120 ms) e o
  escopo `desempenho-congelado`, o `@keyframes squashInSafe` e o passo de 60 ms
  foram removidos. Nenhum `scale` de entrada existe mais no sistema.

**Uma animação por card, inclusive nos `MotionCard`.** Todo `Card` carrega
`.animate-squash` (entrada em CSS). Um card animado por Framer precisa desligar
essa camada com `data-entrada="cascata"` — é o que o Dashboard Executivo faz em
cada `MotionCard` e o que a ponte do módulo de Desempenho passou a fazer de uma
vez para todos os seus cards. Sem esse atributo, o `transform` do CSS vence o
inline da Motion e o `animation-delay` do `useStaggerCards` corre em paralelo ao
`delay` das variants (duas cascatas no mesmo nó).

**Duas listas do módulo de Desempenho mantêm coreografia própria** — não é a
entrada de card, e sim a sequência aprovada daquelas listas: a timeline de
Feedbacks (expansão do 1º card + descida, `animacaoFeedbacks.ts`) e a trilha de
Auditoria (cascata imperativa dia/evento, `PerformanceAuditTimeline.tsx`). Os
blocos de apoio dessas abas (filtros, chips, banners, widgets de resumo) usam
esta régua.

**O Dashboard Principal tem driver próprio, mas os MESMOS números.**
`dashboard/entradaDashboard.ts` mantém o que é exclusivo dele: os dois grupos
independentes (tira de KPI × conteúdo) e a ordem de leitura medida no DOM,
porque ali existem cards sem componente Motion que só o CSS alcança. A régua
(14 px / 520 ms / 120 ms / `ease-out`) é importada de `ui/entradaGlobal.ts` —
depois da padronização não existe mais nenhum número de entrada fora da fonte
única.

**`cardVariants` (`dashboard/MetricCard.tsx`) É a régua global.** O nome foi
mantido porque ≈70 arquivos o importam, mas hoje ele é literalmente
`entradaCardGlobal`: todo call site antigo passou a entrar por esta régua sem
nenhuma mudança de import.

Cobertura travada por teste: `src/components/__tests__/DashboardEntrada.test.ts`
(regra global, fila única, `propsEntradaGlobal`, adoção pelo pacote
compartilhado e isolamento da área congelada).

**Horas Extras (`/horas-extras`) é o exemplo de adoção em página inteira.** As
três faixas da tela usam os DOIS lados do zíper, sem nenhum número local:

| Faixa | Variante | Slots |
|---|---|---|
| tira de KPI Cards (`HorasExtrasKpis`) | `entradaKpiGlobal` | 0, 1, 3, 5 → 0 / 120 / 360 / 600 ms |
| cabeçalho + cartões (`AprovacoesPendentes`) | `entradaConteudoGlobal` | 0, 2, 4, 7 → 0 / 240 / 480 / 840 ms |
| histórico (`HistoricoSolicitacoes`) | `entradaConteudoGlobal` | slot seguinte ao último cartão (8 → 960 ms) |

Os cartões de conteúdo preenchem os vãos dos KPI Cards — nenhum bloco espera a
faixa de cima terminar. O índice é **congelado na montagem** (`useState` com
inicializador) em `CartaoPendente` e no container do histórico: aprovar,
rejeitar, filtrar ou trocar o período desloca cartões e muda o índice que a
página passa, e recalcular o `custom` reabriria a variante de um card já visível.
Cartões revelados pelo "Ver todas" são LEVA NOVA (`entradaCardGlobal` a partir de
0), e o `<tbody>` do histórico não remonta a cada filtro — a única entrada da
tabela é o container. Cobertura: `src/components/horas-extras/__tests__/EntradaHorasExtras.test.tsx`.

## 9. Janelas — uma única coreografia (`CascadeDialogFrame`)

**Não existe uma segunda coreografia de janela no sistema.** Toda janela
animada — o popup "Pendências"/"Próximos Eventos", "Ver detalhes" da Auditoria,
as janelas de Pesquisas/Treinamentos, os diálogos de Premiações/Recrutamento e o
modal **"Novo Desligamento"** — monta os MESMOS variants de
`src/components/ui/cascade-motion.ts` através da MESMA moldura:
`CascadeDialogFrame` (`src/components/ui/cascade-dialog.tsx`).

| Item | Valor | Origem |
|---|---|---|
| véu (`bg-black/60` + `backdrop-blur-sm`) | `opacity 0 → 1` em **0,3 s** | `CASCADE_OVERLAY_OPEN_DURATION` |
| saída do véu | acompanha a saída INTEIRA da janela (cascata + encolhimento) | `cascadeCloseDuration(blocos)` |
| caixa | `scaleX`/`scaleY` em 4 keyframes (`times: [0, 0.22, 0.6, 1]`): nasce pequena, estica as laterais e só então a altura — **0,9 s**, `easeInOut` | `CASCADE_SHELL_OPEN_DURATION` + `cascadeShellVariants(blocos)` |
| caixa — opacidade | `0 → 1` nos primeiros 22% da abertura (imperceptível com movimento normal, porque a caixa ainda tem 16% do tamanho) e `1 → 0` só no fim do encolhimento | `cascadeShellVariants(blocos)` — **canal de "reduzir movimento"** (ver nota abaixo) |
| `transform-origin` | `top center` | `cascade-dialog.tsx` |
| blocos | `opacity 0 → 1` + `y: 8 → 0`, **0,4 s** de entrada / **0,28 s** de saída, **0,12 s** entre blocos | `cascadeItemVariants` + `cascadeContainerVariants` |
| fechamento | blocos somem de trás para frente e SÓ DEPOIS a caixa encolhe (altura → largura) em **0,55 s** | `cascadeShellVariants(blocos)` com `delay` de `cascadeExitContentDuration(blocos)` |
| fechamento — janelas de LISTA | espalhamento total de no máximo **0,08 s**, caixa em **0,26 s** → **0,62 s** de fechamento, CONSTANTE de 3 a 40 linhas (a abertura não muda) | `perfilSaida={CASCADE_SAIDA_RAPIDA}` na moldura (`ui/cascade-motion.ts`) |

**Perfil de saída (`perfilSaida`) — por que ele existe.** A ordem da coreografia
é sempre conteúdo → caixa, então o fechamento PADRÃO cresce com o número de
blocos: `0,12 s` por bloco + `0,28 s` do último + `0,55 s` da caixa. Numa janela
de formulário (3 blocos) isso dá 1,07 s; numa janela cujo conteúdo É uma lista —
um bloco por linha — vira espera e o X parece não responder: a janela
**"Talentos em destaque"** (aba Nine-Box, um bloco por talento) levava **1,67 s**
para fechar com 7 talentos e levaria **3,2 s** com 20. Para esse caso a moldura
aceita `perfilSaida={CASCADE_SAIDA_RAPIDA}`: a lista dissolve praticamente de
uma vez (teto de `0,08 s` na soma dos intervalos) e a caixa encolhe em `0,26 s`.
Sem a prop, **nada muda** — `CASCADE_SAIDA_PADRAO` reproduz exatamente os números
da tabela, e é o que Pendências, Novo Desligamento, Auditoria, Pesquisas e
Treinamentos continuam usando. A abertura é idêntica nos dois perfis: a cascata
de entrada escalonada é a assinatura aprovada do sistema. Cobertura:
`src/components/__tests__/CascadeSaidaPerfis.test.ts` (aritmética dos dois
perfis) e `NineBoxTalentosDialogSaidaRapida.test.tsx` (a janela pede o perfil
rápido e fecha em 0,62 s).

**Nota — "reduzir movimento" (por que a caixa tem opacidade).** Toda a cascata
é `scaleX`/`scaleY` e o Framer Motion **desliga transform** quando o usuário tem
"reduzir movimento" ligado no sistema e a janela está dentro de um
`<MotionConfig reducedMotion="user">` (é o caso de `DesligamentosPage`). Sem um
canal de opacidade a caixa apareceria INTEIRA de uma vez — sem crescimento e sem
fade, o "abre estático e abrupto". Por isso `cascadeShellVariants` anima
`opacity` junto: sob movimento normal é imperceptível (acontece nos primeiros
22%, com a caixa a 16% do tamanho), e sob movimento reduzido é o que faz a
janela ENTRAR EM FADE. Cobertura:
`NovoDesligamentoDialogAnimacao.test.tsx` (caso "entra em FADE").

**Como adotar em outra janela** (inclusive de formulário) — trocar o par
`Dialog` + `DialogContent` pela moldura, informar quantos blocos cascateiam
(normalmente 3: cabeçalho · corpo · rodapé) e envolver cada bloco em
`<motion.div variants={cascadeItemVariants}>`. `DialogHeader`/`DialogTitle`/
`DialogDescription` continuam vindo de `ui/dialog.tsx`:

```tsx
<CascadeDialogFrame
  open={open}
  onOpenChange={handleOpenChange}
  blocks={3}
  className="sm:max-w-lg border-border rounded-none sm:rounded-lg"
  contentClassName="grid gap-3 p-5"
>
  <motion.div variants={cascadeItemVariants}>
    <DialogHeader>…</DialogHeader>
  </motion.div>

  <motion.div variants={cascadeItemVariants}>{/* campos */}</motion.div>

  <motion.div variants={cascadeItemVariants}>{/* rodapé */}</motion.div>
</CascadeDialogFrame>
```

`className`/`contentClassName` são o que preserva o desenho antigo de cada
janela (largura, borda, raio, grid). A centralização vai por
`-translate-x-1/2 -translate-y-1/2` — no Tailwind v4 isso é a propriedade
`translate`, então não briga com o `transform` que o Framer escreve ao animar
`scaleX`/`scaleY`.

Cobertura travada por teste: `src/components/__tests__/CascadeDialogFrameAnimacao.test.tsx`
(a moldura em si), `NovoDesligamentoDialogAnimacao.test.tsx` (o modal de
desligamento crescendo do centro e cascateando os 3 blocos, com o Framer real) e
`NovoDesligamentoDialogFechamento.test.tsx` (Radix real: X, `Esc` e clique fora).


## 10. Revelação de gráfico (clip-path da esquerda para a direita)

**Uma implementação só, para todos os gráficos que se desenham ao aparecer.**
A fonte única é `src/components/ui/revelacaoGrafico.tsx` →
`CONFIG_REVELACAO_GRAFICO` + `<ClipRevelacaoGrafico>`. Nenhum gráfico repete os
números nem o `<clipPath>` animado.

| Item | Valor | Origem |
|---|---|---|
| duração da varredura | **2,5 s** | `CONFIG_REVELACAO_GRAFICO.duracaoSegundos` |
| curva | `easeInOut` (acelera e desacelera nas pontas) | `CONFIG_REVELACAO_GRAFICO.curva` |
| direção | esquerda → direita, na largura do próprio desenho | `<rect height="100%">` com `width: 0 → 100%` |
| o que é revelado | traçado, preenchimento e pontos das séries | `clipPath` nas séries (`url(#<id>)`) |
| animação nativa do Recharts | **desligada** nas séries (`isAnimationActive={false}`) | as duas brigariam pelo mesmo traçado |

**Gatilho.** A varredura começa quando o card terminou de entrar — ouvindo o
`onAnimationComplete` real do `MotionCard` via `useEntradaCardConcluida`, nunca
no mesmo commit da montagem. Em `recrutamento/AnalyticsEvolucao.tsx` esse é o
único gatilho. O estado é monotônico: hover, tooltip, legenda, troca de filtro e
re-render **não** reiniciam o desenho (o `<rect>` é o mesmo nó do React, já em
100%). Quem quiser um reinício explícito passa `chave` — trocar a chave remonta
o retângulo (é o que `HeadcountOverviewCard` faz quando o número de pontos muda).

**Recharts 3 — `clipPath` só vale em `<Area>`.** O `<Line>` reescreve a prop
internamente (`cartesian/Line.js` → `StaticCurve`:
`clipPath: needClip ? url(...) : undefined`) e descarta a do chamador. O `<Area>`
não: as props SVG chegam aos `<path>` do traçado e do preenchimento e aos
`<circle>` dos pontos. Por isso série de linha que precisa ser revelada usa
`<Area fill="none">` — a curva aberta renderizada é a mesma do `<Line>` (mesma
`Curve`, mesmo `type`, mesmo `strokeWidth`), só sem área pintada; `dots`,
`activeDot` e a cor do tooltip (`getLegendItemColor` devolve o `stroke`) ficam
idênticos.

**Movimento reduzido.** O chamador passa `semMovimento={useMovimentoReduzido()}`
(`lib/motionMode.ts`, fonte única): o clip monta já em 100%, sem espera e sem
varredura. Sem esse guarda o `width` do retângulo continuaria animando — o
`reducedMotion` do Framer só desliga *transform* e *layout*.

**Quem usa.** `dashboard/HeadcountOverviewCard.tsx` (dono original do gesto) e
`recrutamento/AnalyticsEvolucao.tsx`. Os gráficos de
`admissoes/AdmissoesDashboard.tsx`, `pages/DashboardExecutivoPage.tsx` e
`pages/PassivoTrabalhistaPage.tsx` ainda trazem o bloco inline, com os MESMOS
números — migrar para o componente não muda um pixel.


## 11. Dobra do detalhe (accordion dentro de linha de tabela)

Painel de detalhe que abre **na própria linha** da tabela — hoje em
`recrutamento/DesempenhoVagasDialog.tsx` (janela "Desempenho por vaga").

| Item | Valor | Fonte |
|---|---|---|
| altura da linha | `0` ↔ `auto` | `animacaoDetalheVaga.ts` → `variantesDetalheVaga().dobra` |
| duração da altura | **300 ms** (faixa de expandir/recolher, §2) | `DOBRA_DURACAO_S` |
| curva | `ease-standard` = `0.4, 0, 0.2, 1` (§3) | `CURVA_DOBRA` |
| fade do conteúdo | 200 ms, começando 60 ms depois | `DOBRA_CONTEUDO_*` |
| etapas (5) | 6 px acima → 0, 140 ms cada, passo de 28 ms | `ETAPA_*` |
| saída | mesma altura em 300 ms; etapas em cascata inversa (passo 14 ms) | `variantesDetalheVaga().etapas.recolhido` |
| movimento reduzido | 150 ms, só altura e opacidade, sem deslocamento nem cascata | `DOBRA_DURACAO_REDUZIDA_S` |

**Por que a célula anima, e não a linha.** `height` em `<tr>` não encolhe
conteúdo (é altura mínima no modelo de tabela). Quem anima é um `div` interno,
com `overflow: hidden`, dentro de uma célula `colSpan` de todas as colunas: a
célula encolhe, a linha acompanha e as linhas seguintes deslizam — sem tocar em
largura da janela, largura de coluna ou layout do `<table>`.

**A linha de detalhe existe sempre.** `AnimatePresence` só desmonta o painel
depois de a saída terminar, e para isso precisa de um contêiner estável. Fechada,
a linha é vazia (altura 0), sem borda e com `aria-hidden` — nenhum filete e
nenhum anúncio extra para o leitor de tela. Com `border-separate` (como nesta
tabela) bordas de `<tr>` **não** são pintadas: o respiro entre o painel e a
próxima vaga vem de um `pb-3` interno, que encolhe junto com a dobra.

**Conferido no navegador** (não é teste automatizado): as alturas sobem e descem
em monotonia, ~300 ms, sem salto entre quadros; o custo por quadro é o mesmo de
uma rolagem da tabela; com `prefers-reduced-motion` a dobra resolve em 150 ms,
sem deslocamento nas etapas.

## 12. Cards do Controle de Ponto (barras, hover e indicadores)

Quatro movimentos da área de Ponto. Nenhum deles inventa ritmo: todos consomem a
régua que já existia.

| Item | Valor | Fonte |
|---|---|---|
| barras verticais (Horas Trabalhadas) | **900 ms** por barra, **100 ms** de intervalo, ease-in-out senoidal, `scaleY` da base | `src/components/ui/crescimentoBarras.ts` (mesmos números de `premiacoes/RewardsSimulator.tsx` → `BARRA_CRESCIMENTO_MS` / `BARRA_INTERVALO_MS` / `easeInOutSine`) |
| acabamento das colunas | preenchimento **20%** + contorno **1,5 px** do mesmo matiz; barra ativa **34%** / **2,5 px** | referência "2. Visualize o impacto" (`<Cell>` + `shape` próprio) |
| gatilho das animações internas | fim real da entrada do card (`onAnimationComplete`) | `src/hooks/useEntradaCardConcluida.ts` |
| barra do "Fechamento do Ponto" | largura `0 → percentual`, **1200 ms**, `ease-out` (§5), gradiente `--primary → --success` | `propsPreenchimentoBarra` (`ui/progressMotion.ts`) |
| hover de linha de tabela | `background-color` **220 ms** (`--default-transition-duration`) para `--background` a 80% | `PontoUltimasBatidasCard.tsx` |
| entrada dos 4 indicadores ("Situação da Equipe") | opacidade `0 → 1` + escala `0,9 → 1`, **520 ms**, passo de **100 ms** | `CONFIG_ENTRADA_CARD_GLOBAL` (`ui/entradaGlobal.ts`) |

**Por que variável CSS nas barras verticais.** O Recharts recria `<rect>` a cada
redesenho (hover, tooltip, refetch). O progresso vive em
`--crescimento-barra-<i>` no CONTÊINER, então um `<rect>` novo herda o valor
atual: terminada a subida, nada reanima. O padrão da variável é `1` — sem
JavaScript, a barra aparece cheia, nunca em zero. `isAnimationActive={false}`
desliga a animação nativa do Recharts (seriam duas subidas no mesmo desenho).

**O que NÃO anima.** Eixo, rótulos, linha de meta e tooltip das "Horas
Trabalhadas"; altura das linhas e colunas da tabela de "Últimas Batidas"; e as
dimensões dos quatro indicadores (escala não afeta layout — nenhum vizinho se
desloca).

**Movimento reduzido.** Tudo passa por `lib/motionMode` (`useMovimentoReduzido`):
barras nascem na altura final, indicadores aparecem direto no estado final e o
preenchimento do fechamento monta já no percentual real.

**Cobertura.** `src/components/__tests__/PontoCardsMotion.test.tsx` lê o fonte do
simulador e dos quatro cards e compara números — mexer num lado derruba o teste.


