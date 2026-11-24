/**
 * Entrada em cascata do Organograma — MESMA linguagem de motion já usada na
 * Timeline de colaboradores (aba "Timeline" de ColaboradorDetalhesPage, em
 * `src/components/colaborador-detalhes/historico/`), com o RITMO um pouco mais
 * lento que o de lá. Nada aqui é invenção nova: cada valor saiu daquela
 * referência e depois foi desacelerado de propósito (ver CASCADE_DURATION e
 * CASCADE_STEP).
 *
 *   • `opacity` + deslocamento inicial: a row entra deslizando da esquerda com
 *     fade, igual às rows de `HistoryEventRow.tsx` (`slideVariants`) — `x: -10`
 *     é o mesmo deslocamento curto e discreto das timelines do app
 *     (ESocialTimeline / PontoAuditTimeline / EventTimeline usam exatamente
 *     `initial={{ opacity: 0, x: -10 }}`).
 *   • `duration: 0.7` + `ease: [0.25, 0.46, 0.45, 0.94]`: a CURVA é a mesma de
 *     `cardVariants` (MetricCard.tsx) — a curva da Timeline de colaboradores
 *     (HistoricoColaborador.tsx / HistorySidebar.tsx) e a que o `0.45` de
 *     HistoryEventRow usa na horizontal. A duração, porém, NÃO é a de lá: o
 *     ritmo foi desacelerado a pedido, em duas rodadas (0.4s → 0.55s → 0.7s),
 *     porque a entrada original passava rápido demais numa árvore inteira.
 *   • `delay: index * 0.1`: o atraso cresce com a posição do item na árvore
 *     (raiz = 0, depois cada subdepartamento e, por fim, os colaboradores) —
 *     100ms entre um item e o seguinte, contra os 50ms (`index * 0.05`) da
 *     referência: a cascata também abre mais espaço entre um item e outro.
 *
 * Ritmo atual: 0.7s de deslize por row e 100ms de intervalo. Com N rows visíveis
 * a cascata começa em 0 e termina em `(N - 1) * CASCADE_STEP + CASCADE_DURATION`
 * — 12 rows ≈ 1.8s. É essa conta que diz se o ritmo está bom.
 *
 * É AQUI que se ajusta o ritmo da cascata: `CASCADE_DURATION` é o tempo de cada
 * item e `CASCADE_STEP` o intervalo entre eles. Nenhum outro arquivo repete
 * esses números — as rows só recebem o preset via `variants={cascadeVariants}`.
 *
 * Quem decide a posição (índice) de cada row é `buildCascadeIndex` em
 * `@/lib/organogramaTree`; este arquivo só define COMO cada item entra.
 *
 * SAÍDA: cada item também tem a PRÓPRIA saída (`closed`), na ordem inversa da
 * entrada — o último item do bloco é o primeiro a ir embora — e ela acontece
 * ANTES de o bloco encolher (o bloco espera a janela inteira dos itens:
 * `cascadeItemsSpan`). Sem isso o "Recolher tudo" era o bloco fechando por cima
 * de itens ainda montados: os itens sumiam cortados pelo `overflow-hidden` do
 * pai, sem nenhuma leitura de "o de baixo sai primeiro". O ritmo e as constantes
 * dessa saída vivem aqui; quem CALCULA o atraso de cada item é
 * `revealItemExitDelay` (organogramaReveal.ts), porque o passo da onda do bloco
 * entra na conta.
 *
 * O ritmo da SAÍDA é bem mais apertado que o da entrada (0,22s por item e 30ms
 * entre itens, contra 0,7s e 100ms): a entrada é o que o olho assiste com calma,
 * a saída é a volta — ela precisa terminar rápido, e "Recolher tudo" repete esse
 * movimento em cada nível da árvore. Os números vivem em `CASCADE_EXIT_*`.
 *
 * Só `transform` (x na entrada, y na saída) e `opacity` animam: tudo fica
 * inteiramente fora do fluxo, então layout, espaçamento, cores e o comportamento
 * de clique/expansão da árvore continuam idênticos.
 */

/**
 * Atraso adicionado por item, em segundos (`delay: index * CASCADE_STEP`) — parte
 * dos `0.05` da referência e fica em `0.1`: 100ms entre um item e o seguinte.
 */
export const CASCADE_STEP = 0.1;

/**
 * Duração de cada item, em segundos — parte dos `0.4` do `cardVariants` e fica em
 * `0.7`: a mesma animação (deslize curto + fade), deliberadamente mais lenta.
 */
export const CASCADE_DURATION = 0.7;

/** Cubic-bezier padrão da Timeline de colaboradores (`cardVariants`/HistoryEventRow). */
export const CASCADE_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

/**
 * Ordem do item na árvore — o `custom` que cada row recebe. `enter` é a posição
 * na cascata de ENTRADA (o índice de `buildCascadeIndex`; o atraso sai daqui
 * dentro, `enter * CASCADE_STEP`) e `exit` é o atraso da SAÍDA em segundos, já
 * resolvido por `revealItemExitDelay` (o passo da onda do bloco + a posição do
 * item contada do fim pro começo). Os dois moram no mesmo `custom` porque a
 * Motion aceita um valor só por elemento — e a row precisa dos dois.
 */
export interface CascadeOrder {
  enter?: number;
  exit?: number;
}

/** Duração da saída de cada item, em segundos (220ms — logo abaixo dos 300ms do bloco). */
export const CASCADE_EXIT_DURATION = 0.22;

/**
 * Deslocamento vertical da saída, em px: o item sobe 4px enquanto desaparece —
 * mesma direção (e mesma medida) do `y` do bloco recolhido, só que no item.
 */
export const CASCADE_EXIT_OFFSET_Y = -4;

/**
 * Degrau entre um item e o seguinte na SAÍDA, em segundos (30ms — bem abaixo dos
 * 100ms da entrada). A entrada é o que o olho observa com calma; a saída é o
 * "Recolher tudo" acontecendo e precisa ser lida como uma volta, não como uma
 * segunda cascata inteira: o degrau curto mantém a ordem ("o de baixo sai
 * primeiro") sem somar espera no bloco que segura a árvore.
 */
export const CASCADE_EXIT_STEP = 0.03;

/**
 * Quanto a saída dos itens pode durar no total, em segundos: um departamento com
 * 40 colaboradores não pode segurar a árvore inteira só porque o bloco dele
 * espera o último item sair. Quando o passo cheio estoura este teto, o degrau
 * ENCOLHE (ver `cascadeItemStep`) em vez de cortar o fim — assim o último item
 * sempre termina exatamente na janela que o bloco aguarda. É esta janela que
 * entra na conta do passo de "Recolher tudo" (`revealLevelWindow`), então ela
 * também é o teto de quanto UM nível pode segurar os outros.
 *
 * O valor não é redondo por acaso: `0,22 + 2 × 0,03` é exatamente a saída de um
 * bloco de TRÊS itens no degrau cheio — até aí nenhum item perde o degrau; daí
 * pra cima ele encolhe proporcionalmente (o teto é do conjunto, não do item).
 */
export const CASCADE_EXIT_MAX_WINDOW = 0.28;

/** Mesma curva da entrada (`[0.22, 1, 0.36, 1]`): largada rápida e chegada em repouso. */
export const CASCADE_EXIT_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Quantos itens o bloco tem, já normalizado (item 0 = bloco sem item nenhum). */
function itemCount(items: number) {
  if (!Number.isFinite(items)) return 0;
  return Math.max(Math.floor(items), 0);
}

/**
 * Degrau EFETIVO da saída, em segundos: `CASCADE_EXIT_STEP` enquanto a janela
 * couber no teto; acima disso ele diminui para a saída inteira caber em
 * `CASCADE_EXIT_MAX_WINDOW`. Bloco com 0 ou 1 item não tem degrau nenhum.
 */
export function cascadeItemStep(items: number) {
  const total = itemCount(items);
  if (total < 2) return 0;
  return Math.min(CASCADE_EXIT_STEP, Math.max(CASCADE_EXIT_MAX_WINDOW - CASCADE_EXIT_DURATION, 0) / (total - 1));
}

/**
 * Janela da saída dos itens, em segundos — do primeiro item que começa a sair
 * até o último terminar. É exatamente o que o bloco espera antes de encolher
 * (`makeRevealVariants`, em organogramaReveal.ts).
 */
export function cascadeItemsSpan(items: number) {
  const total = itemCount(items);
  if (total === 0) return 0;
  return (total - 1) * cascadeItemStep(total) + CASCADE_EXIT_DURATION;
}

/**
 * Espera da saída de UM item, em segundos: `rankFromEnd = 0` é o último item do
 * bloco (o primeiro a sair) e `rankFromEnd = items − 1` é o primeiro (o último a
 * sair). A ordem se inverte na saída de propósito — o item que entrou por último
 * é o primeiro a ir embora.
 */
export function cascadeItemExitDelay(items: number, rankFromEnd = 0) {
  const total = itemCount(items);
  if (total === 0) return 0;
  const rank = Math.min(Math.max(Math.floor(rankFromEnd), 0), total - 1);
  return rank * cascadeItemStep(total);
}

export const cascadeVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: ({ enter = 0 }: CascadeOrder = {}) => ({
    opacity: 1,
    x: 0,
    transition: { delay: enter * CASCADE_STEP, duration: CASCADE_DURATION, ease: CASCADE_EASE },
  }),
  /**
   * Saída do item. Não usa `x` (o item não volta pra esquerda): ele apenas sobe
   * um pouco e desaparece, o mesmo vocabulário do `y` do bloco recolhido. O
   * `delay` chega pronto no `custom` — ver `CascadeOrder`.
   *
   * Este preset é usado por TODOS os itens de um bloco: as rows de colaborador
   * (com `hidden`/`visible`/`closed`) e os wrappers dos subdepartamentos e da
   * mensagem de vazio (com `initial={false}` + `exit="closed"`, porque a cascata
   * de entrada deles é a da própria row que vai dentro).
   */
  closed: ({ exit = 0 }: CascadeOrder = {}) => ({
    opacity: 0,
    y: CASCADE_EXIT_OFFSET_Y,
    transition: { delay: exit, duration: CASCADE_EXIT_DURATION, ease: CASCADE_EXIT_EASE },
  }),
};
