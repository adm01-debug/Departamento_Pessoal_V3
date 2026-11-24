/**
 * ============================================================================
 * ENTRADA DE CARD — RÉGUA GLOBAL DO DESIGN SYSTEM (fila única).
 *
 * FONTE DE VERDADE, em UM lugar, da animação de entrada de cards do sistema:
 *
 *   deslocamentoY : 14 px (o card começa 14px ABAIXO e sobe até y: 0)
 *   duracaoMs     : 520 ms por card
 *   intervaloMs   : 120 ms entre o INÍCIO de um card e o do próximo
 *   curva         : ease-out puro = cubic-bezier(0, 0, 0.58, 1)
 *   escala        : NENHUMA (sem scale/scaleX/scaleY/zoom)
 *   mola          : NENHUMA (sem spring, bounce, elastic, overshoot)
 *
 * Esses são exatamente os números validados no Dashboard Executivo (ver
 * `docs/motion-regua-global.md` §8) — o card seguinte parte com o anterior a
 * ~23% do percurso: sobreposição clara, cascata percebida card a card, e uma
 * página inteira se resolve em ~1,3 s. Nada aqui foi recalibrado na
 * centralização: o arquivo só passou a ser UM e passou a ser de todo mundo.
 *
 * ── POR QUE "FILA ÚNICA" ───────────────────────────────────────────────────
 * O `custom` de um card é a POSIÇÃO dele na própria faixa (0 = primeiro) e a
 * variante converte essa posição em um SLOT da linha do tempo. Uma fila só
 * significa que faixas diferentes (a tira de KPI Cards e os cards de conteúdo,
 * por exemplo) podem se INTERCALAR sem dois relógios independentes — era daí
 * que vinha a sensação de "cascata imperceptível" (cada faixa começando no
 * próprio 0, ou o conteúdo esperando o tamanho da faixa de cima).
 *
 * Mapas de slots prontos (`MapaSlotsEntrada` = `posição → slot`):
 *   slotSequencial          → 0, 1, 2, 3, …  (padrão: uma faixa só)
 *   slotKpiIntercalado      → 0, 1, 3, 5, 6, … (tira de KPI que divide a fila)
 *   slotConteudoIntercalado → 0, 2, 4, 7, 8, … (conteúdo que preenche os vãos)
 * O slot 0 é compartilhado de propósito: o 1º card de cada faixa começa no
 * MESMO instante, e do 4º card de conteúdo em diante a fila segue sozinha.
 *
 * ── COMO USAR (do mais automático ao mais manual) ──────────────────────────
 * 1. Componentes do design system:
 *    `<MetricCard animarEntrada indexForCascata={2} … />` (`dashboard/MetricCard.tsx`)
 * 2. Qualquer card já animado: `{...propsEntradaGlobal(i)}` num `motion.*` —
 *    devolve `custom`/`variants`/`initial`/`animate` com a régua global.
 * 3. Variantes diretas: `variants={entradaCardGlobal}` + `custom={posicao}`
 *    (ou `entradaKpiGlobal` / `entradaConteudoGlobal` para filas cruzadas).
 * `ui/entrada-cards.tsx` (`entradaCard(i)`, usado por Pesquisas, Treinamentos,
 * Recrutamento, Admissões, Desligamentos, Premiações…) consome este módulo:
 * adotar a régua global num módulo novo é importar de lá, não recriar números.
 *
 * ── O QUE ESTE ARQUIVO GOVERNA ─────────────────────────────────────────────
 * TODO o sistema, **inclusive Gestão de Desempenho** (`/avaliacao`) desde
 * 29/10/2026: o módulo deixou de ser exceção por autorização explícita do
 * usuário ("aplicar a mesma animação de entrada do Dashboard Executivo a todos
 * os cards e KPI cards do módulo Avaliação e Performance") e a ponte
 * `avaliacao/entradaCards.tsx` passou a consumir a fila única daqui. O antigo
 * escopo `desempenho-congelado` (squash + cascata de 60 ms) foi removido do
 * `MainLayout`, do `index.css` e do `useStaggerCards`.
 *
 * O Dashboard Principal NÃO é mais exceção: `dashboard/entradaDashboard.ts` e o
 * driver `useEntradaCascataDashboard` aplicam estes mesmos números nos cards sem
 * Motion daquela rota, e `cardVariants` (`dashboard/MetricCard.tsx`) é hoje
 * literalmente `entradaCardGlobal` — todo call site antigo que o importa já
 * entra por esta régua, sem precisar de mudança.
 *
 * MOVIMENTO REDUZIDO: este módulo é só número/variants — quem decide desligar
 * é `lib/motionMode.ts` (`<MotionConfig reducedMotion>` + `useMovimentoReduzido`),
 * fonte única do app. Com a preferência ligada a Motion mantém o fade e
 * desliga o `y`, sem nenhum ajuste aqui.
 * ============================================================================
 */
import type { Variants } from 'framer-motion';

/**
 * Curva do Design System para entradas: `cubic-bezier(0, 0, 0.58, 1)` — o
 * `ease-out` puro do CSS. Declarada como tupla MUTÁVEL porque é o formato que
 * `Transition['ease']` do Framer Motion aceita.
 */
export const CURVA_ENTRADA_EASE_OUT: [number, number, number, number] = [0, 0, 0.58, 1];

/**
 * Parâmetros da entrada de card do sistema inteiro. Calibrar a cascata do app é
 * mexer AQUI — nenhum componente repete estes números.
 */
export const CONFIG_ENTRADA_CARD_GLOBAL = {
  deslocamentoY: 14,
  duracaoMs: 520,
  intervaloMs: 120,
  curva: CURVA_ENTRADA_EASE_OUT,
} as const;

/**
 * Último slot da fila (11 × 120 ms ≈ 1,32 s): o rodapé de uma aba/grid longa
 * não espera mais que isso para começar a entrar. Do 12º slot em diante o
 * atraso para de crescer (o card ainda entra, só não acumula mais espera).
 */
export const MAX_SLOT_ENTRADA_CARD_GLOBAL = 11;

/**
 * Nome do atributo que delimita um ESCOPO de entrada no DOM. O CSS
 * (`src/index.css`) e o driver do Dashboard Principal leem este mesmo literal:
 *
 *   `data-entrada-escopo="dashboard-principal"` → o driver do Dashboard
 *   Principal assume a entrada dos cards daquela rota (os que não são
 *   componentes Motion), com os MESMOS números desta régua.
 *
 * Não existe outro escopo: `/avaliacao` deixou de ser exceção em 29/10/2026
 * (ver o topo deste arquivo) e o antigo `desempenho-congelado` foi removido do
 * `MainLayout`, do `index.css` e do `useStaggerCards`.
 */
export const ATTR_ESCOPO_ENTRADA = 'data-entrada-escopo';

/**
 * Mapa `posição na faixa → slot da fila`. É o único ponto que uma tela precisa
 * escolher: qual faixa o card pertence. Tudo o mais (atraso, duração, curva,
 * teto) continua vindo da configuração acima.
 */
export type MapaSlotsEntrada = (posicao: number) => number;

/** Slots fixos dos KPI Cards de uma tira de 5 (Headcount → Pendências). */
const SLOTS_KPI_INTERCALADO = [0, 1, 3, 5, 6] as const;

/** Slots fixos dos 3 primeiros cards de conteúdo — os que convivem com os KPIs. */
const SLOTS_CONTEUDO_INTERCALADO = [0, 2, 4] as const;

/**
 * Sanidade da posição: nunca negativa, sempre inteira e com um teto absurdo
 * alto (não é o teto da fila — esse é `MAX_SLOT_ENTRADA_CARD_GLOBAL`) para que
 * `NaN`/`Infinity` de um `indice` mal calculado não virem atraso inválido.
 */
function posicaoValida(posicao: number): number {
  if (!Number.isFinite(posicao)) return 0;
  return Math.min(Math.max(Math.round(posicao), 0), 999);
}

/**
 * FILA SIMPLES (padrão global): uma faixa só, uma posição por card —
 * 0, 1, 2, 3… É o que `entradaCardGlobal` / `propsEntradaGlobal` usam e o que
 * qualquer grid ou lista de cards precisa: cada card parte 120 ms depois do
 * anterior, sem furo nem repetição.
 */
export function slotSequencial(posicao: number): number {
  return posicaoValida(posicao);
}

/**
 * FILA CRUZADA — tira de KPI Cards: 0, 1, 3, 5, 6… (e, de 6 em diante, apenas
 * os slots ímpares livres, via `??`). Uma tira com mais de 5 KPIs continua em
 * slots ímpares em vez de repetir o 0 e voltar a parecer animação simultânea.
 */
export function slotKpiIntercalado(posicao: number): number {
  const p = posicaoValida(posicao);
  return SLOTS_KPI_INTERCALADO[p] ?? p * 2 - 1;
}

/**
 * FILA CRUZADA — cards de conteúdo: 0, 2, 4 e, do 4º em diante, 7, 8, 9…
 * Os dois primeiros preenchem os vãos entre os KPIs 2 e 3; depois não há mais
 * KPI para intercalar e a fila segue contínua (nenhum salto, nenhum buraco).
 */
export function slotConteudoIntercalado(posicao: number): number {
  const p = posicaoValida(posicao);
  return SLOTS_CONTEUDO_INTERCALADO[p] ?? p + 4;
}

/** Slot efetivo: inteiro, não negativo e limitado por `MAX_SLOT_...`. */
function posicaoFila(slot: number): number {
  if (!Number.isFinite(slot)) return 0;
  return Math.min(Math.max(Math.round(slot), 0), MAX_SLOT_ENTRADA_CARD_GLOBAL);
}

/** Atraso (em segundos) de um slot da fila, já respeitando o teto global. */
export function atrasoDoSlot(slot: number): number {
  return (posicaoFila(slot) * CONFIG_ENTRADA_CARD_GLOBAL.intervaloMs) / 1000;
}

/**
 * FÁBRICA das variants: todas as entradas do sistema são este mesmo objeto com
 * um mapa de slots diferente. `visible` é função do `custom`, então UM objeto
 * serve para todos os cards — quem define a vez de cada um é a posição.
 *
 * `tween` com `ease` explícito (nunca `spring`): sem ultrapassagem da posição
 * final e sem animar tamanho — só `translateY` + opacidade.
 */
export function criarVariantesEntradaCard(
  mapaSlots: MapaSlotsEntrada = slotSequencial
): Variants {
  return {
    hidden: { opacity: 0, y: CONFIG_ENTRADA_CARD_GLOBAL.deslocamentoY },
    visible: (posicao: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs / 1000,
        delay: atrasoDoSlot(mapaSlots(posicao)),
        ease: CONFIG_ENTRADA_CARD_GLOBAL.curva,
      },
    }),
  };
}

/** Entrada padrão do sistema — fila simples (`custom` = posição: 0…N). */
export const entradaCardGlobal: Variants = criarVariantesEntradaCard();

/** Tira de KPI Cards que divide a fila com o conteúdo (`custom` = 0…4). */
export const entradaKpiGlobal: Variants = criarVariantesEntradaCard(slotKpiIntercalado);

/** Cards de conteúdo que dividem a fila com a tira de KPIs (`custom` = 0…N). */
export const entradaConteudoGlobal: Variants = criarVariantesEntradaCard(slotConteudoIntercalado);

/**
 * Props prontas para espalhar em QUALQUER `motion.*`:
 *
 * ```tsx
 * <motion.div {...propsEntradaGlobal(indice)} className="…" />
 * ```
 *
 * Evita repetir a trinca `custom`/`variants`/`initial`/`animate` — que é
 * exatamente onde as cascatas costumam divergir de tela para tela.
 */
export function propsEntradaGlobal(posicao = 0, variantes: Variants = entradaCardGlobal) {
  return {
    custom: posicao,
    variants: variantes,
    initial: 'hidden',
    animate: 'visible',
  } as const;
}

/** Atraso (em segundos) de um card na fila simples — para testes e timelines. */
export function atrasoEntradaCardGlobal(posicao: number): number {
  return atrasoDoSlot(slotSequencial(posicao));
}
