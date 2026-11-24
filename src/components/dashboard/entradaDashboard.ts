/**
 * ============================================================================
 * ENTRADA DOS CARDS DOS DASHBOARDS — UMA animação só: subida vertical + fade.
 *
 * Driver da entrada de cards do **Dashboard Principal** (`/dashboard`,
 * `pages/DashboardPage.tsx`). Os NÚMEROS não nascem mais aqui: eles vêm da
 * régua única do sistema, `src/components/ui/entradaGlobal.ts`
 * (`CONFIG_ENTRADA_CARD_GLOBAL` — 14px / 520 ms / 120 ms / `ease-out`), a MESMA
 * que o Dashboard Executivo validou e que `.animate-squash` aplica em todo
 * `Card` do design system. O que é exclusivo deste arquivo é o DRIVER: os dois
 * grupos independentes (KPI × conteúdo) e a ordem de leitura medida no DOM,
 * porque aqui existem cards "burros" (sem componente Motion) que só o CSS
 * consegue animar.
 *
 * Desde a padronização global, o Dashboard Principal usa exatamente a mesma
 * animação das demais páginas: mesma opacidade, mesmo deslocamento, mesma
 * duração, mesma curva e mesmo intervalo.
 *
 * ── O QUE A ANIMAÇÃO É (e o que ela NUNCA é) ───────────────────────────────
 *   deslocamentoY : 14 px (o card começa 14px ABAIXO e sobe até y: 0)
 *   opacidade     : 0 → 1 durante a subida
 *   duracaoMs     : 520 ms por card
 *   intervaloMs   : 120 ms entre o INÍCIO de um card e o do próximo (cascata)
 *                   → o card seguinte parte com o anterior a ~23% do percurso:
 *                   sobreposição clara, cascata percebida card a card e uma
 *                   página inteira resolvida em ~1,3 s.
 *   curva         : ease-out puro = cubic-bezier(0, 0, 0.58, 1)
 *   escala        : NENHUMA (sem scale/scaleX/scaleY/zoom)
 *   mola          : NENHUMA (sem spring, bounce, elastic, overshoot)
 *
 * ── DOIS GRUPOS INDEPENDENTES (KPI × conteúdo) — Dashboard PRINCIPAL ───────
 * (No Dashboard Executivo este modelo NÃO vale: lá a fila é ÚNICA e cruzada —
 *  régua global em `ui/entradaGlobal.ts`, `slotKpiIntercalado` /
 *  `slotConteudoIntercalado`.)
 * A página declara, por atributo (`data-entrada-grupo`), a que grupo um card
 * pertence. Cada grupo tem o PRÓPRIO relógio e a PRÓPRIA fila:
 *   kpi      → começa em 0 (o 1º KPI no mesmo instante do 1º card de conteúdo)
 *              e segue a cascata global de 120 ms. Não consome slot da fila dos
 *              cards de conteúdo, então a cascata do conteúdo não começa
 *              "depois dos KPIs": começa no tempo dela.
 *   conteudo → cascata global de 120 ms, na ordem visual de leitura
 *              (esquerda→direita, cima→baixo). Não espera o grupo dos KPIs — e
 *              um KPI que monta depois (skeleton → dado real) não empurra a
 *              fila do conteúdo.
 * Grupo novo = só declarar outro valor no atributo: ganha relógio próprio, com
 * o mesmo intervalo. Nenhum container único controla a página.
 *
 * ── O QUE JÁ FOI UM BUG AQUI (não reintroduzir) ────────────────────────────
 * Não existe NENHUM atraso-base entre os grupos. A versão anterior do Dashboard
 * Executivo somava `quantidade de KPI Cards` ao índice do primeiro card de
 * conteúdo (`custom={baseCascataPainel + 0}`), o que empurrava a cascata de
 * conteúdo para depois do fim da faixa de KPIs: a página ficava com os cards de
 * conteúdo INVISÍVEIS enquanto os KPIs terminavam de subir. Os dois grupos
 * começam em 0 (mesmo instante), cada um na própria cadência (`INDICE_ENTRADA_KPI`
 * para o grupo dos KPIs). Se algum dia for preciso defasar um grupo, que seja um
 * valor pequeno e explícito — nunca o tamanho do outro grupo.
 *
 * O que NÃO muda em nada disto: os números do movimento (14px / 520 ms /
 * 120 ms / `ease-out`) e a ausência total de escala e mola.
 *
 * O único movimento é `translateY`. As dimensões do card são constantes do
 * primeiro ao último frame: nada comprime, nada estica.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE (e por que não é o `cardVariants`) ─────────
 * `cardVariants` (`components/dashboard/MetricCard.tsx`) era a régua ANTIGA
 * (y: 20, 0,4 s, stagger 0,08 s). Na padronização global ela deixou de ter
 * números próprios: hoje é o MESMO objeto de `ui/entradaGlobal.ts`
 * (`entradaCardGlobal`), mantido com o nome antigo para os ~70 arquivos que já
 * o importavam. Os únicos números de 20px / 0,4 s / 0,08 s que sobrevivem são
 * os da área CONGELADA de Gestão de Desempenho, fixados em
 * `avaliacao/entradaCards.tsx`. Este arquivo continua existindo porque o
 * Dashboard Principal precisa de mais que variants: precisa do driver que
 * ordena cards medindo o DOM.
 *
 * ── AS DUAS METADES DA MESMA ANIMAÇÃO ─────────────────────────────────────
 * 1) Cards que JÁ são componentes Framer Motion (os KPI `MetricCard` e os
 *    `MotionCard` de `AnalyticsSection`): esses recebem `entradaExterna`
 *    (`initial={false}`) e são animados pelo driver, como todos os outros —
 *    UMA animação por nó, nunca duas.
 * 2) Cards "burros" (só `<Card>`, sem Motion: Headcount, Departamentos, Status
 *    do Sistema, Morning Briefing, Resumo Operacional, Próximas Atividades,
 *    Atividade Recente): recebem a MESMA animação por CSS (`index.css` →
 *    `@keyframes entradaCascataDashboard`), aplicada pelo driver
 *    `useEntradaCascataDashboard()`. Os números do CSS e os deste arquivo são os
 *    mesmos; o CSS existe porque esses cards não têm componente Motion onde
 *    pendurar o `y`, e criar um wrapper `<motion.div>` em volta mudaria o item
 *    de grid/flex de cada card (layout). Nenhum deles tinha entrada própria
 *    antes: não há animação antiga para remover, há uma para dar.
 *
 * ── O EFEITO DE COMPRESSÃO/ESTICAMENTO (causa e eliminação) ────────────────
 * Até a padronização global, todo `Card` carregava `.animate-squash`
 * (`scale(1.05,0.95)` → `scale(0.98,1.02)` → `scale(1,1)`, 0,7 s, curva
 * elástica): era a origem do "incha/murcha", porque animava `transform` NO MESMO
 * nó em que a entrada vertical escreve o `y`, e animação CSS vence estilo
 * inline. HOJE `.animate-squash` já É a entrada global (fade + 14px, 520 ms) —
 * o `scale` não existe mais em lugar nenhum do sistema. Duas camadas continuam
 * valendo nesta rota para não depender de especificidade, ordem de folha,
 * `@layer` nem de nenhum hook:
 *   1) `index.css` desliga `.animate-squash` dentro do escopo
 *      `[data-entrada-escopo='dashboard-principal']` (as outras rotas usam a
 *      entrada global do próprio `Card`);
 *   2) este driver escreve a animação de entrada **inline e com
 *      `!important`** (`animation-name`/`duration`/`delay`/`timing`/`fill`).
 *      Estilo inline `!important` é o topo da cascata: nenhuma classe, keyframe
 *      ou `animation-delay` de hook externo consegue sobrepor-se.
 *
 * ── CASCATA: ORDEM VISUAL DE LEITURA, CALCULADA NO DOM ────────────────────
 * A ordem não é o índice do React nem a ordem do DOM (o Dashboard Principal tem
 * a coluna direita — "Status do Sistema"/"Próximos Eventos" — renderizada DEPOIS
 * de toda a coluna esquerda, mas exibida no topo). O driver mede a posição real
 * de cada card (`getBoundingClientRect`) e ordena por linha (tolerância de 12px)
 * e, dentro da linha, da esquerda para a direita: é impossível um card de baixo
 * subir antes de um de cima.
 *
 * ── O QUE FOI REMOVIDO DA ETAPA ANTERIOR ──────────────────────────────────
 * - o squash morre no escopo (acima);
 * - o KPI `MetricCard` recebe `entradaExterna` → `initial={false}`: não roda a
 *   própria entrada (y: 20 / 0,4 s / 0,08 s de stagger) e é animado só pelo
 *   driver;
 * - os `MotionCard` de `AnalyticsSection` (que tinham `delay` fixo de
 *   0,62/0,65/0,7/0,8 s e eram a causa de a cascata "não ser vista") montam com
 *   `initial={false}` e também são animados só pelo driver.
 *
 * ── INTERAÇÃO COM O `useStaggerCards` GLOBAL ──────────────────────────────
 * `hooks/use-stagger-cards.ts` percorre TODO `.animate-squash` do documento e
 * escreve `animation-delay` inline (120 ms × índice — o intervalo global). Como
 * aqui a mesma cascata é calculada por GRUPO e por ordem visual medida, os dois
 * números coincidem, mas a fonte precisa ser uma só: o driver marca cada card
 * com `data-stagger-applied` — o atributo que o próprio `useStaggerCards` usa
 * para pular o que já foi processado.
 *
 * ── MOVIMENTO REDUZIDO ───────────────────────────────────────────────────
 * Com `prefers-reduced-motion: reduce` o driver não faz nada (nenhum card recebe
 * atraso nem a animação) e o CSS do escopo também zera a entrada: a página
 * aparece estática, sem cascata.
 * ============================================================================
 */
import { useLayoutEffect } from 'react';
import type { Variants } from 'framer-motion';
// Régua ÚNICA do sistema (`ui/entradaGlobal.ts`), a mesma do Dashboard
// Executivo: 14px / 520ms / 120ms / ease-out. O Dashboard Principal NÃO tem
// mais números próprios — ele é só o driver que aplica esta régua nos cards
// "burros" (sem Motion) daquela rota.
import {
  ATTR_ESCOPO_ENTRADA,
  CONFIG_ENTRADA_CARD_GLOBAL,
  CURVA_ENTRADA_EASE_OUT as CURVA_EASE_OUT,
  MAX_SLOT_ENTRADA_CARD_GLOBAL,
} from '@/components/ui/entradaGlobal';

/** Parâmetros da entrada (fonte única — calibra-se em `ui/entradaGlobal.ts`). */
export const ENTRADA_DASHBOARD = {
  deslocamentoY: CONFIG_ENTRADA_CARD_GLOBAL.deslocamentoY,
  duracaoMs: CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs,
  intervaloMs: CONFIG_ENTRADA_CARD_GLOBAL.intervaloMs,
  curva: CURVA_EASE_OUT,
} as const;

/**
 * Teto de slots da cascata: acima do 12º card o atraso para de crescer
 * (11 × 120 ms = 1,32 s) — o MESMO teto da régua global
 * (`MAX_SLOT_ENTRADA_CARD_GLOBAL`, em `ui/entradaGlobal.ts`). Nenhuma página do
 * sistema tem card suficiente para chegar lá, e o teto impede que uma aba longa
 * faça o usuário esperar a vez de cada miniatura.
 *
 * Os dois grupos (KPI × conteúdo) têm relógios independentes, mas ambos usam o
 * intervalo global de 120 ms (`intervaloDoGrupo`).
 */
export const MAX_ENTRADA_DASHBOARD = MAX_SLOT_ENTRADA_CARD_GLOBAL;

/**
 * Índice de entrada do grupo `kpi` da régua do Dashboard PRINCIPAL — SEMPRE 0.
 *
 * O 1º KPI Card e o 1º card de conteúdo partem no MESMO instante em que a área
 * de conteúdo monta; a partir daí cada grupo segue a própria fila, sem esperar
 * o outro. É o mesmo princípio do Dashboard Executivo (`ui/entradaGlobal.ts` →
 * `slotKpiIntercalado`, onde o slot 0 também é compartilhado).
 *
 * Não derive este valor da quantidade de KPIs nem de qualquer outro grupo: era
 * exatamente isso (`indiceBase = quantidade de KPIs`) que empurrava a entrada do
 * conteúdo para depois do fim da faixa de KPIs no Dashboard Executivo.
 */
export const INDICE_ENTRADA_KPI = 0;

/** Atraso (em segundos) do card de índice `indice`, já respeitando o teto. */
export function atrasoEntradaDashboard(indice: number): number {
  const limitado = Math.min(Math.max(Math.round(indice), 0), MAX_ENTRADA_DASHBOARD);
  return (limitado * ENTRADA_DASHBOARD.intervaloMs) / 1000;
}

/**
 * Variants do padrão. `visible` é uma função do índice (`custom`), então o MESMO
 * objeto serve para todos os cards: quem define a vez de cada um é o `custom`.
 * `tween` com `easeOut` (e não `spring`): nenhuma ultrapassagem da posição final.
 */
export const entradaDashboard: Variants = {
  hidden: { opacity: 0, y: ENTRADA_DASHBOARD.deslocamentoY },
  visible: (indice: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: ENTRADA_DASHBOARD.duracaoMs / 1000,
      delay: atrasoEntradaDashboard(indice),
      ease: ENTRADA_DASHBOARD.curva,
    },
  }),
};

/**
 * Props da entrada prontas para espalhar: `{...entradaCardDashboard(3)}`.
 * Mesmo padrão de `entradaCard()` em `ui/entrada-cards.tsx` — evita repetir a
 * trinca `custom`/`initial`/`animate` (que é onde a cascata costuma divergir).
 */
export function entradaCardDashboard(indice = 0) {
  return {
    custom: indice,
    variants: entradaDashboard,
    initial: 'hidden',
    animate: 'visible',
  } as const;
}

/** Valor do atributo que delimita a página cujo CSS desliga o squash. */
export const ESCOPO_ENTRADA_DASHBOARD = 'dashboard-principal';
/**
 * Nome do atributo de escopo (o mesmo lido pelo CSS em `index.css`) —
 * REEXPORTADO de `ui/entradaGlobal.ts`, que é a fonte única do literal.
 */
export { ATTR_ESCOPO_ENTRADA };
/** Atributo que o driver põe em cada card ENQUANTO a entrada dele está tocando. */
export const ATTR_CARD_CASCATA = 'data-entrada-cascata';

/**
 * Props prontas para espalhar no elemento raiz da página:
 * `<div {...propsEscopoEntradaDashboard}>`. Escrito como objeto para o JSX, o CSS
 * e o driver lerem o MESMO literal.
 */
export const propsEscopoEntradaDashboard = {
  [ATTR_ESCOPO_ENTRADA]: ESCOPO_ENTRADA_DASHBOARD,
} as const;

/* ─── GRUPOS DE ENTRADA ────────────────────────────────────────────────────
 * Cada grupo tem relógio e fila PRÓPRIOS (ver `useEntradaCascataDashboard`).
 * A página escolhe o grupo de um card marcando um container com
 * `data-entrada-grupo`; card sem container marcado cai em `conteudo`. */

/** Atributo que marca o GRUPO de entrada dos cards de um container. */
export const ATTR_GRUPO_ENTRADA = 'data-entrada-grupo';

/** KPI Cards da faixa superior: fila própria, começando em 0 no mesmo instante
 * do 1º card de conteúdo (não esperam ninguém). */
export const GRUPO_ENTRADA_KPI = 'kpi';
/** Demais cards: cascata global (120 ms) na ordem visual de leitura. */
export const GRUPO_ENTRADA_CONTEUDO = 'conteudo';

export type GrupoEntradaDashboard = 'kpi' | 'conteudo';

/**
 * Props prontas para espalhar no container do grupo:
 * `<div {...propsGrupoEntradaDashboard("kpi")}>`. Um container, um grupo — e
 * cada grupo ganha a própria linha do tempo no driver.
 */
export function propsGrupoEntradaDashboard(grupo: GrupoEntradaDashboard) {
  return { [ATTR_GRUPO_ENTRADA]: grupo } as const;
}

/**
 * Chave de grupo a partir do valor do atributo (função pura, testável).
 *
 * Valor ausente/vazio → `conteudo`. Qualquer outro valor é respeitado como
 * grupo PRÓPRIO (ganha relógio independente) — é o "Grupo 3" do pedido: basta
 * declarar um `data-entrada-grupo="outro"` em outro container.
 */
export function chaveDoGrupo(valor: string | null | undefined): string {
  const limpo = valor?.trim();
  return limpo ? limpo : GRUPO_ENTRADA_CONTEUDO;
}

/**
 * Intervalo entre inícios DENTRO de um grupo (ms) — o MESMO da régua global
 * (`CONFIG_ENTRADA_CARD_GLOBAL.intervaloMs`, 120 ms) para todos os grupos.
 *
 * Antes o grupo `kpi` entrava com intervalo 0 (a faixa inteira de uma vez), o
 * que só existia nesta rota: no Dashboard Executivo — a referência — a tira de
 * KPI Cards também entra em cascata. Uniformizar o intervalo mantém os dois
 * relógios independentes (o grupo de conteúdo continua partindo de 0 no mesmo
 * instante, sem esperar os KPIs) e faz a MESMA cadência valer no sistema todo.
 */
export function intervaloDoGrupo(chave: string): number {
  void chave;
  return ENTRADA_DASHBOARD.intervaloMs;
}

/**
 * Marca de "já animado" — impede que um re-render (chegada de dados, hover,
 * troca de aba) reinicie a cascata no meio da página.
 */
const ATTR_CARD_JA_ANIMADO = 'data-entrada-aplicada';

/**
 * Atributo público de `useStaggerCards` (`hooks/use-stagger-cards.ts`): um card
 * marcado assim é ignorado pela cascata global do squash — que, aqui, escreveria
 * `animation-delay` de 120 ms por cima do nosso.
 */
const ATTR_STAGGER_GLOBAL = 'data-stagger-applied';

/** Tolerância (px) para considerar dois cards na MESMA linha visual. */
const TOLERANCIA_LINHA_PX = 12;

/**
 * Ordem de leitura (linha de cima → de baixo; dentro da linha, esquerda →
 * direita) de um conjunto de posições medidas. Devolve a PERMUTAÇÃO de índices
 * (`[2, 0, 1, …]`), em função pura, para poder ser testada sem DOM.
 *
 * Duas passadas de propósito: ordenar direto por `top` com tolerância não é
 * transitivo (a empata com b, b empata com c, a não empata com c) e o resultado
 * passaria a depender da ordem de entrada. Aqui primeiro agrupam-se as LINHAS
 * pela diferença em relação ao primeiro card da linha; só então cada linha é
 * ordenada por `left`.
 */
export function ordenarPorLeitura(
  posicoes: ReadonlyArray<{ top: number; left: number }>,
  toleranciaPx: number = TOLERANCIA_LINHA_PX
): number[] {
  const ordem = posicoes
    .map((_, indice) => indice)
    .sort((a, b) => posicoes[a].top - posicoes[b].top || posicoes[a].left - posicoes[b].left);

  let inicioDaLinha = 0;
  for (let cursor = 1; cursor <= ordem.length; cursor += 1) {
    const fimDaLinha =
      cursor === ordem.length ||
      Math.abs(posicoes[ordem[cursor]].top - posicoes[ordem[inicioDaLinha]].top) > toleranciaPx;

    if (fimDaLinha) {
      const linha = ordem.slice(inicioDaLinha, cursor).sort((a, b) => posicoes[a].left - posicoes[b].left);
      ordem.splice(inicioDaLinha, linha.length, ...linha);
      inicioDaLinha = cursor;
    }
  }

  return ordem;
}

/** `true` se o card está dentro de outro card (card aninhado não entra na cascata). */
function temCardAncestral(card: HTMLElement, escopo: HTMLElement): boolean {
  let pai = card.parentElement;
  while (pai && pai !== escopo) {
    if (pai.classList.contains('animate-squash')) return true;
    pai = pai.parentElement;
  }
  return false;
}

/**
 * Cards que ainda não entraram: os de topo (não aninhados) e visíveis —
 * `getClientRects()` vazio é `display: none` (ex.: cards ocultos por breakpoint),
 * e um card invisível não pode consumir índice da cascata.
 */
function coletarCardsPendentes(escopo: HTMLElement): HTMLElement[] {
  return Array.from(escopo.querySelectorAll<HTMLElement>('.animate-squash')).filter(
    (card) =>
      !card.hasAttribute(ATTR_CARD_JA_ANIMADO) && card.getClientRects().length > 0 && !temCardAncestral(card, escopo)
  );
}

/**
 * Grupo do card = o do container marcado mais próximo DENTRO do escopo da
 * página. Sem container marcado, o card é do grupo de conteúdo (cascata).
 *
 * O container do próprio escopo é ignorado de propósito: marcar a raiz da
 * página com um grupo faria um único container controlar todos os cards — que é
 * exatamente o que os grupos independentes existem para evitar.
 */
function grupoDeEntradaDoCard(card: HTMLElement, escopo: HTMLElement): string {
  const container = card.closest<HTMLElement>(`[${ATTR_GRUPO_ENTRADA}]`);
  if (!container || container === escopo || !escopo.contains(container)) return GRUPO_ENTRADA_CONTEUDO;
  return chaveDoGrupo(container.getAttribute(ATTR_GRUPO_ENTRADA));
}

/** Nome do `@keyframes` em `index.css` — o MESMO que o CSS do escopo declara. */
export const KEYFRAMES_ENTRADA_DASHBOARD = 'entradaCascataDashboard';
/** `ease-out` em CSS (a mesma curva de `ENTRADA_DASHBOARD.curva`). */
const CURVA_CSS = 'cubic-bezier(0, 0, 0.58, 1)';
/** Longhands escritos inline — todos com `!important`. */
const PROPS_ANIMACAO = [
  'animation-name',
  'animation-duration',
  'animation-delay',
  'animation-timing-function',
  'animation-fill-mode',
  'animation-iteration-count',
  'animation-direction',
] as const;

/**
 * Aplica a entrada em UM card: atraso, duração, curva e preenchimento escritos
 * inline com `!important`, mais o atributo de escopo que o CSS usa como
 * fallback.
 *
 * Por que inline `!important` e não só a classe/atributo: `.animate-squash`
 * (a origem do "comprime/estica") é uma regra global de `index.css` presente em
 * TODO `Card` do sistema, e `animation` de folha de estilo vence `transform`
 * inline. Escrever os longhands inline com `!important` põe a entrada no topo
 * absoluto da cascata — nada (classe, `@layer`, hook global, estilo inline sem
 * `!important`) consegue sobrepor-se enquanto a animação roda.
 */
function animarCardNaCascata(card: HTMLElement, atrasoMs: number): void {
  let desarme = 0;

  const liberar = () => {
    window.clearTimeout(desarme);
    card.removeEventListener('animationend', aoTerminar);
    for (const prop of PROPS_ANIMACAO) card.style.removeProperty(prop);
    card.removeAttribute(ATTR_CARD_CASCATA);
  };

  // `animationend` SOBE pela árvore: animação de um filho não pode liberar o card.
  const aoTerminar = (evento: AnimationEvent) => {
    if (evento.target !== card) return;
    liberar();
  };

  // Marca ANTES de escrever: `useStaggerCards` percorre todo `.animate-squash`
  // ainda não marcado no MESMO frame e escreveria `animation-delay` de 120 ms ×
  // índice por cima do nosso atraso.
  card.setAttribute(ATTR_CARD_JA_ANIMADO, '');
  card.setAttribute(ATTR_STAGGER_GLOBAL, '');
  card.setAttribute(ATTR_CARD_CASCATA, '');

  card.style.setProperty('animation-name', KEYFRAMES_ENTRADA_DASHBOARD, 'important');
  card.style.setProperty('animation-duration', `${ENTRADA_DASHBOARD.duracaoMs}ms`, 'important');
  card.style.setProperty('animation-delay', `${Math.round(atrasoMs)}ms`, 'important');
  card.style.setProperty('animation-timing-function', CURVA_CSS, 'important');
  card.style.setProperty('animation-fill-mode', 'both', 'important');
  card.style.setProperty('animation-iteration-count', '1', 'important');
  card.style.setProperty('animation-direction', 'normal', 'important');

  card.addEventListener('animationend', aoTerminar);

  // Rede de segurança: com `fill-mode: both`, um keyframe ausente (CSS antigo
  // em cache) deixaria o card invisível para sempre. Este temporizador devolve
  // o controle do nó mesmo sem `animationend`.
  desarme = window.setTimeout(liberar, atrasoMs + ENTRADA_DASHBOARD.duracaoMs + 600);
}

/**
 * Driver da entrada dos cards desta página. Chame UMA vez no componente da
 * página e marque o elemento raiz dela com `propsEscopoEntradaDashboard`.
 *
 * `useLayoutEffect` (e não `useEffect`): os atrasos precisam estar escritos
 * ANTES da primeira pintura — se o navegador pintasse com o atraso padrão (0),
 * todos os cards subiriam juntos e a cascata nunca seria vista.
 *
 * `MutationObserver`: o dashboard monta cards em momentos diferentes (skeleton →
 * dado real, gráficos, widgets). O observer pega esses nós e os coloca na
 * sequência DO GRUPO DELES, na ordem visual; nada que já entrou é reiniciado.
 *
 * Grupos (`data-entrada-grupo`): cada grupo tem relógio e fila próprios — os
 * KPI Cards e os cards de conteúdo usam a MESMA cadência (120 ms), mas em
 * relógios independentes: a tira de KPIs não consome a fila do conteúdo (o 1º
 * card de conteúdo parte em 0 no mesmo instante do 1º KPI). Nenhum container
 * controla a página inteira; ver `propsGrupoEntradaDashboard`.
 *
 * Duas garantias que vieram da investigação do "comprime/estica":
 * - o escopo é procurado com ESPERA (e não com um `if (!escopo) return`): se a
 *   página só monta o wrapper depois (skeleton/dados), o driver desistia e os
 *   cards ficavam com o squash global + a cascata global de 120 ms;
 * - o atraso sai do CURSOR DE CADA GRUPO (`proximoSlotMs`), não do índice da
 *   leva: uma segunda leva de cards continua a sequência em vez de reiniciar em
 *   0 (reiniciar é o que fazia a leva inteira parecer uma animação simultânea).
 */
export function useEntradaCascataDashboard(ativo: boolean = true): void {
  useLayoutEffect(() => {
    if (!ativo || typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const seletorEscopo = `[${ATTR_ESCOPO_ENTRADA}='${ESCOPO_ENTRADA_DASHBOARD}']`;
    /**
     * Relógio + fila de CADA grupo (chave do grupo → estado).
     *
     * `inicio` marca quando o grupo apareceu pela primeira vez; `proximoSlotMs`
     * é o próximo horário livre DAQUELE grupo. Dois grupos nunca compartilham
     * esses valores: o KPI que monta depois não empurra a fila do conteúdo, e a
     * cascata do conteúdo não espera o grupo dos KPIs terminar (ou começar).
     */
    const relogios = new Map<string, { inicio: number; proximoSlotMs: number }>();
    const relogioDoGrupo = (chave: string, agora: number) => {
      const existente = relogios.get(chave);
      if (existente) return existente;
      const novo = { inicio: agora, proximoSlotMs: 0 };
      relogios.set(chave, novo);
      return novo;
    };
    let escopo: HTMLElement | null = null;
    let agendado = false;
    let observerCards: MutationObserver | null = null;
    let observerEscopo: MutationObserver | null = null;

    const aplicar = () => {
      agendado = false;
      if (!escopo) return;
      const cards = coletarCardsPendentes(escopo);
      if (cards.length === 0) return;

      // Agrupa ANTES de medir: cada grupo é ordenado e agendado por conta própria.
      const porGrupo = new Map<string, HTMLElement[]>();
      for (const card of cards) {
        const chave = grupoDeEntradaDoCard(card, escopo);
        const doGrupo = porGrupo.get(chave);
        if (doGrupo) doGrupo.push(card);
        else porGrupo.set(chave, [card]);
      }

      const agora = performance.now();

      for (const [chave, cardsDoGrupo] of porGrupo) {
        const relogio = relogioDoGrupo(chave, agora);
        const intervalo = intervaloDoGrupo(chave);
        const posicoes = cardsDoGrupo.map((card) => {
          const caixa = card.getBoundingClientRect();
          return { top: caixa.top, left: caixa.left };
        });

        ordenarPorLeitura(posicoes).forEach((posicao) => {
          // Slot na linha do tempo DO GRUPO, não no índice da leva: um card que
          // monta depois (skeleton → dado real, gráfico, widget) CONTINUA a
          // sequência do grupo em vez de recomeçar em 0 — recomeçar era o que
          // fazia uma segunda leva inteira parecer uma animação simultânea.
          const esperado = relogio.proximoSlotMs - (agora - relogio.inicio);
          relogio.proximoSlotMs += intervalo;
          animarCardNaCascata(cardsDoGrupo[posicao], Math.max(0, esperado));
        });
      }
    };

    const agendar = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(aplicar);
    };

    const conectar = (raiz: HTMLElement) => {
      escopo = raiz;
      aplicar(); // síncrono: a primeira pintura já sai com a cascata certa
      observerCards = new MutationObserver((mutacoes) => {
        if (mutacoes.some((mutacao) => mutacao.addedNodes.length > 0)) agendar();
      });
      observerCards.observe(raiz, { childList: true, subtree: true });
    };

    const existente = document.querySelector<HTMLElement>(seletorEscopo);
    if (existente) {
      conectar(existente);
    } else {
      // A página pode montar o escopo DEPOIS deste efeito (skeleton → dados,
      // Suspense, empresa ainda não selecionada). Antes, um `return` silencioso
      // aqui fazia o driver desistir para sempre — e aí os cards ficavam com o
      // squash global (comprime/estica) e com a cascata global de 120 ms (que
      // lê como animação simultânea). Agora o driver ESPERA o escopo aparecer.
      observerEscopo = new MutationObserver(() => {
        const achado = document.querySelector<HTMLElement>(seletorEscopo);
        if (!achado) return;
        observerEscopo?.disconnect();
        observerEscopo = null;
        conectar(achado);
      });
      observerEscopo.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observerCards?.disconnect();
      observerEscopo?.disconnect();
    };
  }, [ativo]);
}

/*
 * ── A RÉGUA DE FILA ÚNICA SAIU DAQUI (centralização global) ────────────────
 * O Dashboard Executivo NÃO tem mais números próprios neste arquivo: a régua
 * que ele validou (14px / 520 ms / 120 ms, ease-out, fila única que intercala
 * a tira de KPI Cards com os cards de conteúdo) foi promovida a RÉGUA GLOBAL
 * do Design System e mora em `src/components/ui/entradaGlobal.ts`:
 * `CONFIG_ENTRADA_CARD_GLOBAL`, `criarVariantesEntradaCard`,
 * `slotKpiIntercalado`, `slotConteudoIntercalado`, `entradaKpiGlobal` e
 * `entradaConteudoGlobal`. Lá também estão `propsEntradaGlobal()` (props
 * prontas para qualquer `motion.*`) e a entrada padrão de fila simples
 * (`entradaCardGlobal`), que é a que o resto do sistema consome via
 * `ui/entrada-cards.tsx`.
 *
 * Este arquivo ficou com o DRIVER do DASHBOARD PRINCIPAL (14px / 520 ms /
 * 120 ms, os MESMOS números da régua global, importados de `entradaGlobal`): o
 * driver CSS, os dois grupos independentes e a ordem de leitura medida no DOM.
 * Nada daqui foi copiado para lá — a curva ease-out e a configuração são as
 * mesmas, vindas de `ui/entradaGlobal.ts` (fonte única).
 */
