/**
 * ============================================================================
 * FUNIL DE RECRUTAMENTO — COREOGRAFIA INTERNA DO PAINEL (entrada única).
 *
 * Este arquivo é a FONTE ÚNICA dos números e das variantes da sequência que
 * constrói o funil quando o painel aparece na tela. Nenhum componente repete
 * essas medidas (mesma regra de `ui/entradaGlobal.ts` para a cascata de cards).
 *
 * ── O QUE ACONTECE, EM ORDEM ───────────────────────────────────────────────
 *   0 ms     Triagem (azul) expande do centro: scale 0,65 → 1 + fade, 450 ms
 *   350 ms   Entrevista (roxo)    desliza de −24 px → 0 + fade, 350 ms
 *   470 ms   Teste (âmbar)        idem
 *   590 ms   Proposta (rosa)      idem
 *   710 ms   Contratado (verde)   idem
 *   950 ms   mini card 1 (Triagem → Entrevista) sobe de +12 px → 0, 300 ms
 *   1050 ms  mini card 2 (Entrevista → Teste)   idem, passo de 100 ms
 *   1150 ms  mini card 3 (Teste → Proposta)     idem
 *   1250 ms  mini card 4 (Proposta → Contratado) idem
 *   1550 ms  fim (`duracaoTotalS`)
 *
 * ── POR QUE O DESLOCAMENTO É EXPRESSO EM UNIDADES DO DESENHO ───────────────
 * As cinco setas são `path` dentro de UM `<svg>` com `viewBox` de 440 unidades
 * e `preserveAspectRatio="none"` (ver `AnalyticsFunil.tsx`). Em SVG, um
 * `translate` em CSS é lido em UNIDADES do sistema local, não em px de tela: o
 * desenho é esticado para a largura do painel DEPOIS. Por isso o valor é dado
 * em unidades (`DESLOCAMENTO_ETAPA_UNIDADES`) e o rótulo HTML que fica sobre a
 * seta recebe a MESMA distância convertida para porcentagem da própria caixa
 * (`deslocamentoEmPorcentagem`): as duas camadas andam juntas em qualquer
 * largura de painel, sem medir o DOM e sem leitura de layout por quadro.
 * 24 unidades valem ~22 px na faixa de referência (440 unidades desenhadas em
 * ~403 px de painel) — a mesma ordem do "~24 px" pedido.
 *
 * ── MOVIMENTO REDUZIDO ─────────────────────────────────────────────────────
 * Quem decide é `lib/motionMode.ts` (fonte única do app). Com a preferência
 * ligada, `AnalyticsFunil` já monta os elementos no estado FINAL (`animar` no
 * primeiro render, `initial={false}`): nada de espera, nada de transformação.
 * Os `variants` daqui não leem `prefers-reduced-motion` — quem lê é o
 * componente, como manda o sistema.
 *
 * ── UMA VEZ POR MONTAGEM ───────────────────────────────────────────────────
 * O gatilho é de fora (IntersectionObserver via `useInView`, `once: true`, a
 * 20% do card visível — `FRACAO_VISIVEL_PARA_INICIAR`). Depois do primeiro
 * disparo o estado não volta: hover, troca de filtro, atualização de dados e
 * rolagem não reanimam. Só uma nova navegação (remontagem) rearma a sequência.
 * ============================================================================
 */
import type { Variants } from 'framer-motion';
import { CURVA_ENTRADA_EASE_OUT } from '@/components/ui/entradaGlobal';

/**
 * Curva da sequência: a MESMA `ease-out` do Design System usada na cascata de
 * cards (`cubic-bezier(0, 0, 0.58, 1)`). É a "desaceleração suave" pedida para
 * a expansão da Triagem — nada de mola, overshoot ou bounce.
 */
const CURVA = CURVA_ENTRADA_EASE_OUT;

/** Escala inicial da Triagem: cresce de 65% até o tamanho final (centro a centro). */
export const ESCALA_TRIAGEM_INICIAL = 0.65;

/**
 * Deslocamento horizontal de entrada das etapas 2–5, em UNIDADES do `viewBox`
 * do funil — o mesmo sistema de coordenadas do desenho.
 *
 * Por que não em px: as setas são `path` de um SVG esticado
 * (`preserveAspectRatio="none"`), e em SVG o `translate` é lido em unidades
 * locais ANTES do esticamento — um valor fixo em px só valeria para UMA largura
 * de painel, e a seta se descolaria do rótulo que ela carrega. Em unidades, os
 * dois andam sempre a mesma distância (`deslocamentoEmPorcentagem` converte para
 * o rótulo HTML). 24 unidades ≈ 22 px na faixa de referência.
 */
export const DESLOCAMENTO_ETAPA_UNIDADES = 24;

/**
 * Deslocamento horizontal das linhas do layout MOBILE, em px reais.
 *
 * No mobile o funil vira uma lista de linhas de largura total dentro do painel,
 * que tem `overflow-hidden` e 16 px de respiro (`px-4`) em cada lado: 24 px
 * jogariam a borda esquerda da linha 8 px para FORA do card, e o recorte do
 * canto arredondado apareceria no meio da animação. 12 px cabem inteiros no
 * respiro e mantêm a leitura de "veio da esquerda".
 */
export const DESLOCAMENTO_ETAPA_MOBILE_PX = 12;

/** Deslocamento vertical de entrada dos mini cards de conversão, em px reais. */
export const DESLOCAMENTO_MINI_PX = 12;

/** Duração da expansão da Triagem (0,45 s). */
export const DURACAO_TRIAGEM_S = 0.45;

/** Duração do deslize de cada etapa seguinte e de cada linha mobile (0,35 s). */
export const DURACAO_ETAPA_S = 0.35;

/** Duração da subida de cada mini card de conversão (0,3 s). */
export const DURACAO_MINI_S = 0.3;

/** Início do deslize da 1ª etapa depois da Triagem — a cascata começa aqui. */
const ATRASO_PRIMEIRA_DESLIZE_S = 0.35;

/** Intervalo entre o INÍCIO de uma etapa e o da seguinte (cascata contínua). */
const PASSO_ETAPA_S = 0.12;

/**
 * Início do primeiro mini card: 240 ms depois de a última etapa COMEÇAR a
 * entrar (0,71 s + 0,24 s = 0,95 s), para a faixa de baixo não competir com o
 * fim do funil.
 */
const ATRASO_PRIMEIRO_MINI_S = 0.95;

/** Intervalo entre o INÍCIO de um mini card e o do seguinte. */
const PASSO_MINI_S = 0.1;

/**
 * Fração do card que precisa estar visível para a sequência partir (20%,
 * conforme a especificação). Abaixo disso a animação correria fora da tela.
 */
export const FRACAO_VISIVEL_PARA_INICIAR = 0.2;

/**
 * Atraso (s) da etapa `indice` (0 = Triagem). A Triagem não espera ninguém; as
 * demais partem 120 ms depois da anterior, começando em 350 ms — é o que faz a
 * sequência do funil correr entre 0,35 s e 1,06 s, como na referência.
 */
export function atrasoEtapa(indice: number): number {
  const posicao = Number.isFinite(indice) ? Math.max(0, Math.round(indice)) : 0;
  if (posicao === 0) return 0;
  return ATRASO_PRIMEIRA_DESLIZE_S + (posicao - 1) * PASSO_ETAPA_S;
}

/** Atraso (s) do mini card `indice` (0…3): 950 ms + 100 ms por posição. */
export function atrasoMiniCard(indice: number): number {
  const posicao = Number.isFinite(indice) ? Math.max(0, Math.round(indice)) : 0;
  return ATRASO_PRIMEIRO_MINI_S + posicao * PASSO_MINI_S;
}

/**
 * Duração total da sequência (s): o último mini card (1,25 s) mais a própria
 * duração (0,3 s) = 1,55 s. Exportada para documentação e testes — nenhuma
 * animação depende dela para terminar (tudo é declarativo).
 */
export function duracaoTotalS(): number {
  return atrasoMiniCard(3) + DURACAO_MINI_S;
}

/**
 * Converte uma distância em UNIDADES do `viewBox` para PORCENTAGEM da caixa de
 * um elemento HTML que ocupe `larguraUnidades` naquele mesmo sistema.
 *
 * É o que faz o rótulo (HTML, sobreposto ao SVG) andar exatamente a mesma
 * distância da seta que ele acompanha: `translateX` em porcentagem, no HTML,
 * é relativo à própria largura do elemento — e essa largura, no desenho, é
 * conhecida (`caixaTexto`). Sem medida de DOM: o valor é o mesmo em qualquer
 * largura de painel.
 */
export function deslocamentoEmPorcentagem(deslocamento: number, larguraUnidades: number): string {
  if (!(larguraUnidades > 0)) return '0%';
  return `${(deslocamento * 100) / larguraUnidades}%`;
}

/**
 * Zero na MESMA unidade do deslocamento inicial.
 *
 * A Motion interpola quadros entre o valor de partida e o de chegada; misturar
 * `%` com número (px) quebra essa interpolação. Por isso o alvo de chegada é
 * sempre `0` na unidade da partida: `'0%'` para os rótulos, `0` para setas e
 * linhas do mobile.
 */
function zeroNaUnidadeDe(deslocamento: number | string): number | string {
  return typeof deslocamento === 'string' && deslocamento.trim().endsWith('%') ? '0%' : 0;
}

/** `custom` das variantes de deslize: atraso (s) + deslocamento inicial. */
export interface AjusteDeslize {
  /** Quando esta peça começa, em segundos (ver `atrasoEtapa`). */
  atraso: number;
  /**
   * Distância inicial (já NEGATIVA — vem da esquerda), na unidade do elemento:
   * unidades do `viewBox` nas setas do SVG, px nas linhas do mobile e
   * porcentagem da própria caixa nos rótulos (`deslocamentoEmPorcentagem`).
   */
  deslocamento: number | string;
}

/** `custom` das variantes dos mini cards: apenas o atraso (s). */
export interface AjusteMiniCard {
  /** Quando este mini card começa, em segundos (ver `atrasoMiniCard`). */
  atraso: number;
}

/**
 * TRIAGEM — expansão de dentro para fora.
 *
 * `scale` sai de 0,65 e a opacidade sobe junto até 1. O `transform-origin` é o
 * CENTRO: no HTML é o padrão do CSS; nos `path` do SVG a própria Motion escreve
 * `transform-box: fill-box` + `transform-origin: 50% 50%` quando existe
 * `transform` no elemento (`motion-dom/render/svg/utils/build-attrs`), então a
 * seta cresce a partir do próprio centro. Nada de rotação, cor ou deslocamento
 * horizontal.
 */
export const VARIANTES_TRIAGEM: Variants = {
  oculto: { opacity: 0, scale: ESCALA_TRIAGEM_INICIAL },
  visivel: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURACAO_TRIAGEM_S, delay: 0, ease: CURVA },
  },
};

/**
 * ETAPAS SEGUINTES — deslize horizontal da esquerda para a direita.
 *
 * Usada pelas quatro setas restantes (em unidades do viewBox), pelos rótulos
 * HTML que ficam sobre elas (em px) e pelas linhas do layout mobile (em px):
 * mesma variante, `custom` diferente — as duas camadas de cada etapa entram
 * juntas, com o mesmo atraso, e nenhuma delas mexe em largura ou layout.
 */
export const VARIANTES_DESLIZE: Variants = {
  oculto: (ajuste: AjusteDeslize) => ({ opacity: 0, x: ajuste.deslocamento }),
  visivel: (ajuste: AjusteDeslize) => ({
    opacity: 1,
    x: zeroNaUnidadeDe(ajuste.deslocamento),
    transition: { duration: DURACAO_ETAPA_S, delay: ajuste.atraso, ease: CURVA },
  }),
};

/**
 * MINI CARDS DE CONVERSAO — sobem 12 px enquanto aparecem.
 *
 * `y` (e não um `top`/`margin` animado) mantém o mini card na posição final de
 * layout durante toda a animação: a grade de quatro colunas não reflui.
 */
export const VARIANTES_MINI_CARD: Variants = {
  oculto: { opacity: 0, y: DESLOCAMENTO_MINI_PX },
  visivel: (ajuste: AjusteMiniCard) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DURACAO_MINI_S, delay: ajuste.atraso, ease: CURVA },
  }),
};
