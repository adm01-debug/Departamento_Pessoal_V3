/**
 * Abertura e fechamento dos blocos do Organograma: o que aparece/some quando um
 * departamento é expandido ou recolhido (subdepartamentos, colaboradores e a
 * mensagem "Nenhum colaborador vinculado.") — portanto também é o que acontece
 * por trás de "Expandir tudo" e "Recolher tudo".
 *
 * TÉCNICA: a MESMA que o app já usa pra revelar conteúdo de altura variável —
 * `height: 0 → 'auto'` + `opacity` dentro de um `AnimatePresence`, com
 * `overflow-hidden` no wrapper (`layout/EmpresaSelector.tsx` no menu de
 * empresas, `ui/sync-error-state.tsx` nos detalhes técnicos,
 * `LocaisTrabalhoPage.tsx` no formulário de local). Nenhuma biblioteca nova
 * (Framer Motion que já está no projeto), nenhum `scale` e nenhuma mola: só
 * `height`, `opacity` e um `y` curto animam, e as três transições são TWEEN
 * (`duration` + `ease`) — o resto (layout, cores, espaçamento das rows) fica
 * exatamente como estava.
 *
 * RITMO: 400ms abrindo e 300ms fechando (antes: 220ms/200ms). Com as curvas
 * abaixo, o miolo do movimento acontece no primeiro terço e o último terço é o
 * "assentamento" da altura — é essa cauda longa que tira a sensação seca. Fechar
 * é mais curto que abrir de propósito: sair precisa ser lido como a volta do
 * expandir, nunca como outra animação, e é essa duração que "Recolher tudo" paga
 * em cada nível da árvore.
 *
 * EASING: abrir usa `[0.22, 1, 0.36, 1]` — velocidade alta na largada (tangente
 * inicial ≈ 4,5) e tangente FINAL ZERO, ou seja o bloco chega em repouso em vez
 * de frear de repente nos últimos quadros. Como os dois `y` da curva são 1, o
 * progresso nunca passa de 100%: não estufa e não volta (aqui não existe
 * resquício de mola elástica). Fechar usa `[0.4, 0, 0.2, 1]` (a curva
 * "standard" do Material): derivada zero nas DUAS pontas — começa em repouso e
 * termina em repouso. O espelho da abertura, que era o desenho daqui antes, foi
 * trocado de propósito: espelho de uma curva easy-out faz o fechamento TERMINAR
 * em velocidade máxima, que é exatamente o `snap` que este ajuste veio remover.
 *
 * `y`: `REVEAL_OFFSET_Y` (-4px) no estado recolhido e 0 no aberto — mesmo
 * vocabulário da cascata das rows (que chegam 10px da esquerda), só que no eixo
 * vertical do bloco. São 4px dentro da folga que os recuos internos
 * (`pl-4`/`pb-1.5` dos subdepartamentos, `ml-4`/`pl-4` dos colaboradores) já
 * têm, então o conteúdo nunca encosta na borda de corte do wrapper.
 *
 * ONDA ENTRE BLOCOS (abrir): cada bloco espera `slot × REVEAL_WAVE_STEP` (90ms)
 * para abrir. `slot` NÃO é a profundidade: é a posição do bloco na pré-ordem da
 * árvore visível (`buildRevealWave`, em @/lib/organogramaTree) — a MESMA ordem em
 * que as rows entram na cascata de entrada. Só a profundidade (o desenho daqui
 * antes) não bastava: numa árvore de dois níveis sobrava um único degrau de 40ms
 * e "Expandir tudo" continuava parecendo uma parede levantando de uma vez. Com a
 * ordem da árvore, o bloco do topo começa, o do próximo ramo entra depois e
 * assim até o pé da página — a expansão vira uma descida. O teto de slots
 * (`REVEAL_MAX_STAGGERED_BLOCKS`, espelhando o `maxStaggeredItems` de
 * ui/motion-presets.ts) existe pra onda não somar tempo demais em árvores
 * grandes: acima do teto, os blocos entram junto.
 *
 * ONDA ENTRE BLOCOS (fechar): o `slot` de fechamento é OUTRO — a posição do
 * bloco DENTRO do nível dele, contada de trás pra frente (o último do nível sai
 * primeiro). Isso porque quem manda no fechamento é o nível: "Recolher tudo"
 * recolhe um nível por vez, do fundo pra raiz (`buildCollapseStages`, consumido
 * por OrganogramaPage), e o que sobra pro preset é ordenar os blocos do nível
 * que está saindo naquele passo. Sem essa divisão, tirar todos os
 * `expandedIds` de uma vez desmontaria a árvore inteira no mesmo commit — e
 * bloco que já está sendo desmontado pelo pai não roda a própria saída (o
 * `AnimatePresence` congela a subárvore que está saindo).
 *
 * O RITMO DA VOLTA é mais apertado de propósito: fechar é uma leitura de
 * "rebobinar" o que acabou de abrir, então o recolhimento anda em menos tempo, com
 * degraus menores e menos slots que a abertura (`REVEAL_CLOSE_WAVE_STEP` 50ms ×
 * `REVEAL_MAX_STAGGERED_CLOSE_BLOCKS` 3 = 150ms, `REVEAL_CLOSE_DURATION` 300ms,
 * contra 90ms × 8 = 720ms e 400ms abrindo). A hierarquia continua legível sem essa
 * folga porque quem carrega a leitura do fechamento é o passo por NÍVEL (a página
 * recolhe um nível por vez), não a onda dentro do nível. O passo seguinte também
 * pode atropelar a cauda do anterior (`REVEAL_STAGE_OVERLAP`): o que ele espera é
 * o CONTEÚDO sair, e quando o vão começa a encolher o conteúdo do nível já foi
 * embora.
 *
 * ITENS ANTES DO BLOCO: o bloco NÃO encolhe enquanto os itens dele estiverem
 * saindo. A saída dos itens (rows de colaborador, rows de subdepartamento e a
 * mensagem de "nenhum colaborador") é escalonada dentro do bloco
 * (`CASCADE_EXIT_STEP` / `revealItemExitDelay`) e o `delay` do estado
 * `collapsed` soma a janela inteira dos itens (`cascadeItemsSpan`) — é a ordem
 * que o olho espera: o conteúdo sai, o vão fecha. Como o `slot` de fechamento
 * também entra nessa conta, o mesmo atraso vale para os itens (o bloco e os
 * itens dele são um passo só da onda). O teto (`CASCADE_EXIT_MAX_WINDOW`) impede
 * que um departamento com muitos colaboradores segure a árvore.
 *
 * É AQUI que se ajusta o ritmo de abrir/fechar: `REVEAL_OPEN_DURATION` /
 * `REVEAL_CLOSE_DURATION` são os tempos, `REVEAL_WAVE_STEP` é o degrau entre
 * blocos ao ABRIR e `REVEAL_CLOSE_WAVE_STEP` o degrau ao FECHAR (mais curto — a
 * volta é rebobinar), `CASCADE_EXIT_STEP`/`CASCADE_EXIT_DURATION` (em
 * organogramaCascade.ts) são o degrau e o tempo dos itens, e
 * `makeRevealVariants(wave)` é o preset que os blocos consomem (via
 * `OrganogramaRevealBlock`). Nenhum outro arquivo repete esses números. A
 * cascata de ENTRADA das rows é outro arquivo/outro preset
 * (organogramaCascade.ts): ela segue com o ritmo desacelerado dela (0,7s por
 * item, 100ms entre itens) e a onda daqui é um degrau novo, mais curto, entre
 * BLOCOS — os dois são independentes de propósito. A SAÍDA dos itens, porém,
 * mora lá (é o mesmo `variants` da row), com os números de
 * `organogramaCascade.ts` alimentados pelo `delay` calculado aqui.
 *
 * O que NÃO muda: enquanto o bloco está aberto, o wrapper que a Motion usa é
 * uma div sem padding, margem ou cor (só `overflow-hidden`, que a revelação de
 * altura exige) — o layout em repouso é idêntico ao de antes. E enquanto está
 * recolhido o bloco continua FORA da árvore: nada é renderizado escondido.
 */

import { cascadeItemExitDelay, cascadeItemsSpan } from '@/components/organograma/organogramaCascade';

/** Duração da abertura, em segundos (400ms — dentro da faixa de 350–450ms). */
export const REVEAL_OPEN_DURATION = 0.4;

/**
 * Duração do fechamento, em segundos (300ms — um degrau abaixo dos 400ms da
 * abertura, fora da faixa dela de propósito). Fechar é a VOLTA, e "Recolher tudo"
 * repete essa duração em cada nível da árvore: 360ms por nível era o que ainda
 * fazia o botão parecer lento. Não desce mais que isso porque a cauda de
 * assentamento (o que tira a sensação de corte seco) é o que sobra do tempo.
 */
export const REVEAL_CLOSE_DURATION = 0.3;

/**
 * Curva de abertura: `[0.22, 1, 0.36, 1]`. Velocidade alta na largada (tangente
 * inicial ≈ 4,5) e tangente final 0 — chega em repouso, sem freada.
 * `y1 = y2 = 1`, logo o progresso é sempre ≤ 100%: sem overshoot (nada de mola).
 */
export const REVEAL_OPEN_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Curva de fechamento: `[0.4, 0, 0.2, 1]` (standard do Material). Tangente 0 no
 * início E no fim: o bloco sai do repouso e volta ao repouso — é o oposto do
 * espelho da abertura, que terminava em velocidade máxima.
 */
export const REVEAL_CLOSE_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

/**
 * Deslocamento vertical do bloco, em px: negativo no estado recolhido (o bloco
 * "vem de cima") e 0 no aberto. Curto de propósito — só dá direção ao
 * movimento, dentro da folga que os recuos internos já têm.
 */
export const REVEAL_OFFSET_Y = -4;

/** Degrau da onda entre blocos, em segundos (90ms — dentro da faixa de 80–120ms). */
export const REVEAL_WAVE_STEP = 0.09;

/**
 * Quantos slots a onda usa antes do teto (0,09 × 8 = 720ms no máximo). Acima
 * disso os blocos entram junto, pra árvore grande não pagar a soma dos degraus.
 */
export const REVEAL_MAX_STAGGERED_BLOCKS = 8;

/**
 * Degrau da onda de FECHAMENTO, em segundos (50ms — bem mais curto que os 90ms da
 * abertura). Fechar é rebobinar: "Recolher tudo" precisa terminar rápido, e o que
 * mantém a leitura em cascata no fechamento é o passo por NÍVEL (a página recolhe
 * um nível por vez), não a distância entre os blocos do mesmo nível. Passo curto
 * também reduz a espera de um recolhimento SOLTO: o `close` de um bloco é a
 * posição dele dentro do nível, então o bloco "de trás" de um nível cheio não fica
 * parado esperando a vez quando o usuário clica só nele.
 */
export const REVEAL_CLOSE_WAVE_STEP = 0.05;

/**
 * Teto de slots da onda de fechamento (0,05 × 3 = 150ms). É bem menor que o da
 * abertura de propósito: quanto mais fundo o nível, mais blocos disputando o
 * mesmo passo, e a volta não pode somar espera — acima disso os blocos fecham
 * junto com o último slot escalonado. Três slots já dão a leitura de "o último do
 * nível sai primeiro" que o passo por nível precisa.
 */
export const REVEAL_MAX_STAGGERED_CLOSE_BLOCKS = 3;

/**
 * Onde está o BLOCO na árvore: `open` é a posição na pré-ordem (a mesma ordem da
 * cascata de entrada), `close` é a posição dentro do nível contada de trás pra
 * frente (o último do nível sai primeiro) e `items` é quantos itens o bloco
 * revela quando está aberto. Quem monta isso é `buildRevealWave`
 * (@/lib/organogramaTree); o bloco só consome.
 */
export interface RevealWave {
  open?: number;
  close?: number;
  items?: number;
}

/**
 * Slot já normalizado pro teto da onda: nada de negativo, de fração ou de valor
 * fora do número (um slot "estranho" cai no slot 0, que nunca espera). O teto é
 * parâmetro porque a volta tem o dela (`REVEAL_MAX_STAGGERED_CLOSE_BLOCKS`).
 */
function staggerSlot(slot: number, max: number) {
  if (!Number.isFinite(slot)) return 0;
  return Math.min(Math.max(Math.floor(slot), 0), max);
}

/**
 * Espera de UM passo da onda de ABERTURA, em segundos (`slot × REVEAL_WAVE_STEP`).
 */
export function revealWaveDelay(slot = 0) {
  return staggerSlot(slot, REVEAL_MAX_STAGGERED_BLOCKS) * REVEAL_WAVE_STEP;
}

/**
 * Espera de UM passo da onda de FECHAMENTO, em segundos (`close ×
 * REVEAL_CLOSE_WAVE_STEP`): mesmo mecanismo da abertura, degrau e teto próprios —
 * ver `REVEAL_CLOSE_WAVE_STEP`.
 */
export function revealCloseWaveDelay(close = 0) {
  return staggerSlot(close, REVEAL_MAX_STAGGERED_CLOSE_BLOCKS) * REVEAL_CLOSE_WAVE_STEP;
}

/**
 * Espera da SAÍDA de um item do bloco, em segundos: o passo da onda do bloco
 * (`close`) mais a posição do item contada do fim pro começo (`rankFromEnd = 0`
 * é o último item, que sai primeiro). O item e o bloco andam no mesmo passo da
 * onda — é essa soma que faz o conjunto se ler como um movimento só.
 */
export function revealItemExitDelay({ close = 0, items = 0 }: RevealWave, rankFromEnd = 0) {
  return revealCloseWaveDelay(close) + cascadeItemExitDelay(items, rankFromEnd);
}

/**
 * Quanto tempo um NÍVEL leva para sair inteiro, em segundos: o bloco mais
 * atrasado do nível (o maior slot de fechamento) + a janela dos itens do bloco
 * mais cheio dele + a duração do fechamento. É a janela do passo do "Recolher
 * tudo" (`buildCollapseStages` entrega `closeSlots` e `maxItems`).
 *
 * O pior caso é limitado de propósito pelos tetos envolvidos: 150ms de onda
 * (`REVEAL_MAX_STAGGERED_CLOSE_BLOCKS`) + 280ms de itens
 * (`CASCADE_EXIT_MAX_WINDOW`) + 300ms de bloco = 730ms por nível.
 */
export function revealLevelWindow({ closeSlots = 0, maxItems = 0 }: { closeSlots?: number; maxItems?: number } = {}) {
  return revealCloseWaveDelay(closeSlots) + cascadeItemsSpan(maxItems) + REVEAL_CLOSE_DURATION;
}

/**
 * Quanto do FIM de um passo o passo seguinte pode atropelar, em segundos: 30% da
 * duração do fechamento. Os últimos quadros de `REVEAL_CLOSE_DURATION` são só o
 * assentamento da altura — o conteúdo do nível saiu bem antes (o bloco espera a
 * janela dos itens inteira pra começar a encolher) e o vão já está praticamente
 * fechado. Deixar o nível de cima começar nesse ponto encurta o "Recolher tudo"
 * sem cortar nada que o olho ainda esteja lendo: o que não pode ser atropelado é
 * a SAÍDA DO CONTEÚDO, e ela termina uma duração inteira antes do fim da janela.
 */
export const REVEAL_STAGE_OVERLAP = REVEAL_CLOSE_DURATION * 0.3;

/**
 * Intervalo entre um passo do "Recolher tudo" e o seguinte, em segundos: a janela
 * do nível (`revealLevelWindow`) menos a cauda que pode ser atropelada
 * (`REVEAL_STAGE_OVERLAP`). É o que a página usa pra agendar o próximo nível —
 * nunca negativo, pra um passo curto (nível de um bloco só, sem item) não virar
 * "passo seguinte antes do atual".
 */
export function revealStageGap({ closeSlots = 0, maxItems = 0 }: { closeSlots?: number; maxItems?: number } = {}) {
  return Math.max(revealLevelWindow({ closeSlots, maxItems }) - REVEAL_STAGE_OVERLAP, 0);
}

/**
 * Os dois estados do bloco. Cada estado carrega a PRÓPRIA transição porque é a
 * transição do ALVO que a Motion usa: no fechamento vale a espera do `close` mais
 * a janela dos itens (`cascadeItemsSpan` — o bloco só encolhe depois que o
 * conteúdo saiu), na abertura vale a espera do `open`.
 *
 * Repare que as duas esperas usam degraus DIFERENTES: `open` anda em
 * `REVEAL_WAVE_STEP` (90ms) e `close` em `REVEAL_CLOSE_WAVE_STEP` (50ms) — é essa
 * assimetria que faz o "Recolher tudo" fechar mais rápido que abre sem mudar nada
 * do ritmo aprovado da abertura.
 *
 * Devolve objeto novo a cada chamada, mas é `OrganogramaRevealBlock` que o
 * memoiza — o preset não guarda estado.
 */
export function makeRevealVariants({ open = 0, close = 0, items = 0 }: RevealWave = {}) {
  return {
    collapsed: {
      height: 0,
      opacity: 0,
      y: REVEAL_OFFSET_Y,
      transition: {
        delay: revealCloseWaveDelay(close) + cascadeItemsSpan(items),
        duration: REVEAL_CLOSE_DURATION,
        ease: REVEAL_CLOSE_EASE,
      },
    },
    expanded: {
      height: 'auto',
      opacity: 1,
      y: 0,
      transition: {
        delay: revealWaveDelay(open),
        duration: REVEAL_OPEN_DURATION,
        ease: REVEAL_OPEN_EASE,
      },
    },
  };
}
