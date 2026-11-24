/**
 * ============================================================================
 * ENTRADA DOS EVENTOS DA TRILHA DE AUDITORIA — dirigida pelo COMPOSITOR.
 *
 * ── O QUE FOI TENTADO ANTES (e por que não bastou) ─────────────────────────
 * 1ª versão: cada bloco entrava animando `height: 0 → 'auto'` por 700ms, com
 * 150ms de intervalo. Para animar `'auto'` a Motion mede o nó e escreve `height`
 * em PIXELS a cada quadro — `height` não é propriedade de composição, então cada
 * quadro invalidava LAYOUT e PAINT em dezoito linhas simultâneas.
 * 2ª versão: trocamos as propriedades por `opacity` + `translateY` (compostas na
 * GPU). O reflow sumiu, mas a entrada continuou travada — porque o problema não
 * era só QUAL propriedade animava; era QUEM dirigia a animação.
 *
 * ── A CAUSA REAL: O DRIVER ─────────────────────────────────────────────────
 * A Motion anima na MAIN THREAD (`requestAnimationFrame` + escrita de estilo a
 * cada quadro). E a trilha monta junto com a aba: ~20 linhas densas, cada uma
 * com quatro blocos, três tooltips do Radix e o trilho da timeline — nos
 * primeiros quadros depois desse mount a main thread está ocupada com estilo,
 * layout e handlers, e o rAF da Motion simplesmente não recebe quadro. A entrada
 * então "anda aos pulos" exatamente no trecho que o olho está acompanhando.
 *
 * Por isso a entrada agora é KEYFRAME CSS (`src/index.css`, bloco "TRILHA DE
 * AUDITORIA (Desligamentos)"). Animação CSS de `transform`/`opacity` é avaliada
 * pelo COMPOSITOR contra a linha do tempo do documento: mantém o ritmo mesmo com
 * a main thread ocupada. É a MESMA decisão que levou o Kanban de Admissões e o
 * Pipeline de Recrutamento para keyframes CSS — ver
 * `components/kanban/entradaKanban.ts`.
 *
 * ── O QUE CONTINUA AQUI ────────────────────────────────────────────────────
 * Este módulo é a FONTE ÚNICA do contrato: a classe, o ritmo, o teto, a curva,
 * o atraso de cada posição (o coordenador da cascata) e a SAÍDA. O CSS não
 * recalcula nada — recebe atraso, deslocamento, duração e curva por custom
 * property (inline, escrito por `estiloEntrada`) e a classe por
 * `TRILHA_CLASSE_ENTRADA`. A curva de ENTRADA passou a ser própria
 * (`TRILHA_ENTRADA_EASE`, ver o comentário dela); só a SAÍDA segue o vocabulário
 * do Organograma (`REVEAL_CLOSE_EASE`). O CSS repete os MESMOS números como
 * fallback das variáveis (ver o bloco no `index.css`).
 *
 * ── 3ª CALIBRAGEM (29/10/2026): FLUIDEZ, NÃO SÓ COMPOSIÇÃO ─────────────────
 * Compositor não é sinônimo de fluido. A entrada era 460ms com a curva de
 * abertura do Organograma, `cubic-bezier(0.22, 1, 0.36, 1)` — uma curva
 * "chega-e-segura", que entrega ~75% do percurso nos primeiros 100ms (22% da
 * duração). Somada ao deslocamento de 4px, ela se lia como um PISCAR: rápido e
 * sem caminho visível. Pior, o trecho visível do movimento caía exatamente sobre
 * os primeiros quadros do mount da aba (os mais caros), e o olho lia isso como
 * travamento. Três mudanças, todas de RITMO:
 *   • curva de ENTRADA própria, `cubic-bezier(0.2, 0, 0, 1)` (a "emphasized
 *     decelerate" do Material 3): arranca praticamente parada, ganha velocidade
 *     devagar e passa a maior parte do tempo desacelerando. Em 620ms, metade da
 *     opacidade só chega aos ~124ms (antes: ~40ms) e o movimento continua
 *     legível até ~400ms — o percurso PERCEBIDO triplica sem a onda arrastar;
 *   • duração 460 → 620ms e deslocamento 4 → 8px: com arranque suave, a subida
 *     precisa de mais espaço para ser lida como deslize, não como fade;
 *   • passo 70 → 90ms e teto 8 → 6: a sobreposição continua (90 < 620), mas cada
 *     bloco fica mais tempo em cena antes de o próximo entrar, e o dia mais
 *     longo continua assentando em pouco mais de 1s (6 × 90 + 620 = 1.160ms).
 * O mecanismo é o mesmo (keyframe CSS, zero JS por quadro); o que mudou foi a
 * distribuição do tempo dentro dele.
 *
 * ── MEDIÇÃO (Chromium, CSS real do build, `Emulation.setCPUThrottlingRate(4)`) ─
 * Opacidade da 1ª linha da onda, quadro a quadro:
 *
 *          t=100ms   t=200ms   t=400ms   fim do movimento
 *   antes   0,52      0,89      1,00      ~250ms (y já em -0,1px)
 *   depois  0,06      0,57      0,91      ~600ms (y ainda em -0,7px aos 400ms)
 *
 * Ou seja: antes a linha estava PRATICAMENTE PRONTA em 200ms (o olho via um
 * flash); agora metade do caminho acontece entre 150ms e 300ms e o resto é
 * desaceleração. Pacing medido nas duas versões: 16,7ms por quadro, ZERO quadros
 * perdidos, inclusive com CPU 4× mais lenta — a animação nunca foi o gargalo de
 * quadro; o que faltava era ritmo.
 *
 * ── A SAÍDA CONTINUA NO FRAMER (e isso é intencional) ──────────────────────
 * Quando um filtro remove um evento, o nó precisa RECOLHER a altura, senão o
 * espaço fica reservado até o desmonte e as linhas de baixo sobem de uma vez
 * (pulo). Altura não é composta, então esse é o ÚNICO momento com reflow: UM nó
 * por vez, 220ms, e só na saída. Quem orquestra é o `AnimatePresence`; a
 * entrada não passa mais por ele (`initial={false}`), então nunca existem duas
 * animações de entrada no mesmo nó.
 * ============================================================================
 */
import type { CSSProperties } from 'react';
import type { Variants } from 'framer-motion';
import { REVEAL_CLOSE_EASE, REVEAL_OFFSET_Y, REVEAL_OPEN_EASE } from '@/components/organograma/organogramaReveal';

/**
 * Classe que liga o keyframe de entrada (`index.css`). Fica no MESMO nó que o
 * `AnimatePresence` controla na saída: o keyframe entrega `transform`/`opacity`
 * de volta ao Framer assim que termina (`backwards`, não `both`), então o
 * recolhimento da saída escreve altura/opacidade sobre um nó já em repouso.
 *
 * Única sobreposição possível: sair ANTES de a entrada terminar (filtro trocado
 * no primeiro ~1s). Nesse intervalo o keyframe ainda é dono do `opacity` e vence
 * o estilo inline da Motion — mas o que move o layout é o recolhimento da
 * ALTURA, que é do Framer e acontece igual; o nó é desmontado no fim da saída.
 */
export const TRILHA_CLASSE_ENTRADA = 'trilha-evento-entrada';

/**
 * Duração da ENTRADA de um bloco (ms) — vira `--trilha-entrada-duracao` e casa
 * com o fallback do keyframe em `index.css` (620ms).
 *
 * Histórico: 260 → 460 → 620ms. Com 260ms a lista "piscava" (as dezoito linhas
 * apareciam quase juntas). 460ms já era lido como movimento, mas a curva de
 * arranque rápido entregava ~75% do percurso em 100ms: o olho só via esse
 * primeiro trecho, e era nele que o mount da aba derrubava quadro. 620ms com a
 * curva de arranque suave distribui o percurso em ~400ms de movimento
 * percebido — mais lento de ler, sem parecer espera no fim da onda.
 */
export const TRILHA_ENTRADA_DURACAO_MS = 620;

/**
 * Intervalo entre o INÍCIO de dois blocos consecutivos do MESMO grupo (ms).
 *
 * 90ms continua MENOR que a duração de propósito: as entradas se SOBREPÕEM (o
 * 2º bloco começa com o 1º ainda em movimento) e é isso que se lê como onda
 * contínua — com passo ≥ duração a cascata vira fila e o olho vê "um bloco,
 * depois outro". Subiu de 70 → 90ms junto com a duração: com blocos mais longos
 * em cena, 70ms empilhava quase sete linhas em movimento ao mesmo tempo (ruído
 * em vez de onda) e apressava a leitura da cascata.
 */
export const TRILHA_ENTRADA_PASSO_MS = 90;

/**
 * Teto de passos com atraso CRESCENTE dentro de um grupo: do 8º bloco em diante
 * o atraso congela (`6 × 90ms = 540ms`). Com a duração de 620ms, um dia assenta
 * em ~1,16s por mais longo que seja — a lista inteira (todos os dias começam
 * juntos, o contador reinicia por grupo) fica pronta em pouco mais de 1s.
 * Desceu de 8 para 6 para caber no mesmo orçamento com o passo maior.
 */
export const TRILHA_PASSOS_MAX = 6;

/**
 * Duração da SAÍDA de um resultado removido pelo filtro (Framer, segundos).
 * É o único momento em que a trilha anima `height` (ver o topo do arquivo).
 * 220ms: igual à régua de interação do sistema e curta o bastante para o
 * recolhimento ser lido como "a linha saiu", não como espera.
 */
export const TRILHA_SAIDA_DURACAO = 0.22;

/** A mesma duração da saída em ms — usada na coordenação sair→entrar. */
export const TRILHA_SAIDA_DURACAO_MS = TRILHA_SAIDA_DURACAO * 1000;

/**
 * Curva de ABERTURA do painel "Mais filtros" (Framer) — a MESMA do Organograma.
 * A entrada dos eventos NÃO usa esta: ela tem curva própria, de arranque lento
 * (`TRILHA_ENTRADA_EASE`).
 */
export const TRILHA_EASE = REVEAL_OPEN_EASE;

/** Curva de FECHAMENTO (saída) — a MESMA do recolhimento do Organograma. */
export const TRILHA_SAIDA_EASE = REVEAL_CLOSE_EASE;

/**
 * Deslocamento vertical inicial do bloco, em px — o DOBRO do `REVEAL_OFFSET_Y`
 * (-4px) do Organograma, publicado como constante para o teste travar esse
 * vínculo. Aqui o nó é uma linha densa de ~120px: 4px sobre ela quase não se
 * veem (a entrada virava só fade). 8px é o deslocamento que se lê como deslize
 * sem parecer salto. Desce ao CSS por `--trilha-entrada-offset`.
 */
export const TRILHA_ENTRADA_OFFSET_PX = REVEAL_OFFSET_Y * 2;

/**
 * Curva da ENTRADA — `cubic-bezier(0.2, 0, 0, 1)` (a "emphasized decelerate" do
 * Material 3), publicada como `--trilha-entrada-curva`.
 *
 * NÃO é a curva do Organograma (`REVEAL_OPEN_EASE`, `(0.22, 1, 0.36, 1)`), e a
 * diferença é o ponto: aquela entrega ~75% do percurso em 100ms e serve a um nó
 * pequeno respondendo a um clique; numa linha de ~120px, com dezoito delas em
 * cascata, esse arranque se lê como piscada. Esta arranca perto de zero, ganha
 * velocidade devagar e gasta a maior parte do tempo desacelerando — o movimento
 * tem COMEÇO visível. Efeito colateral bem-vindo: o trecho que move menos é
 * justamente o dos primeiros quadros (os caros, do mount da aba).
 */
export const TRILHA_ENTRADA_EASE = 'cubic-bezier(0.2, 0, 0, 1)';

/** Estilo inline de um bloco: só as variáveis que o keyframe consome. */
export type EstiloEntradaTrilha = CSSProperties &
  Record<
    | '--trilha-entrada-delay'
    | '--trilha-entrada-offset'
    | '--trilha-entrada-duracao'
    | '--trilha-entrada-curva',
    string
  >;

/**
 * Atraso (ms) da posição `indice` DENTRO de um grupo (0 = cabeçalho do dia,
 * 1 = 1º evento, …). Puro e determinístico: a mesma posição devolve sempre o
 * mesmo atraso. Acima do teto, o atraso para de crescer.
 */
export function atrasoDoGrupoMs(indice: number): number {
  const i = Math.floor(Number.isFinite(indice) ? indice : 0);
  return Math.min(Math.max(i, 0), TRILHA_PASSOS_MAX) * TRILHA_ENTRADA_PASSO_MS;
}

/**
 * Coordenador da cascata: recebe o número de EVENTOS de cada grupo, na ordem de
 * leitura, e devolve para cada grupo a fila de atrasos em ms começando pelo
 * CABEÇALHO — `[cabeçalho, evento1, evento2, …]`. Cada grupo começa do zero
 * (reset por grupo), então nenhum dia espera a fila do anterior.
 *
 * Puro e determinístico: a mesma entrada devolve sempre a mesma saída, então o
 * resultado é testável e não depende de efeito colateral. Quem espera é o
 * `animation-delay` de cada bloco, nunca um `setTimeout`.
 */
export function coordenarTrilhaPorGrupo(contagens: number[]): number[][] {
  return contagens.map((qtd) => {
    const n = Math.max(Math.floor(Number.isFinite(qtd) ? qtd : 0), 0);
    return Array.from({ length: n + 1 }, (_, i) => atrasoDoGrupoMs(i));
  });
}

/**
 * Estilo inline do bloco: atraso da cascata, deslocamento, duração e curva do
 * keyframe. Nada além de custom properties — nenhuma propriedade de layout é
 * escrita, e `transform`/`opacity` ficam inteiramente com o CSS. Duração e curva
 * descem daqui (e não do `index.css`) para os números terem UM dono: o fallback
 * declarado no CSS só cobre o caso de a classe ser usada sem este `style`.
 */
export function estiloEntrada(atrasoMs: number): EstiloEntradaTrilha {
  const ms = Math.max(Number.isFinite(atrasoMs) ? Math.round(atrasoMs) : 0, 0);
  return {
    '--trilha-entrada-delay': `${ms}ms`,
    '--trilha-entrada-offset': `${TRILHA_ENTRADA_OFFSET_PX}px`,
    '--trilha-entrada-duracao': `${TRILHA_ENTRADA_DURACAO_MS}ms`,
    '--trilha-entrada-curva': TRILHA_ENTRADA_EASE,
  };
}

/**
 * Estado de SAÍDA do bloco — o único que o Framer ainda governa.
 *
 * `collapsed` recolhe a altura e some: é o que faz o vizinho subir suave quando
 * o filtro remove um evento. Curto, sem atraso e na curva de fechamento.
 *
 * NÃO existe variant de ENTRADA: a entrada é o keyframe CSS
 * (`TRILHA_CLASSE_ENTRADA`). Se alguém voltar a animar a entrada pelo Framer,
 * `coordenarTrilhaPorGrupo`/`estiloEntrada` deixam de ser usados e o teste de
 * contrato acusa.
 */
export const trilhaSaidaVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { delay: 0, duration: TRILHA_SAIDA_DURACAO, ease: TRILHA_SAIDA_EASE },
  },
};

