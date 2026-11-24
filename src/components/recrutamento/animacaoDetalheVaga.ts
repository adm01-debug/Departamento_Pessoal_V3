/**
 * ============================================================================
 * DETALHE DA VAGA — A DOBRA (accordion) DA LINHA NA JANELA DE DESEMPENHO
 *
 * FONTE ÚNICA dos números e das variantes da expansão/recolhimento do painel de
 * detalhe de uma vaga dentro da tabela de `DesempenhoVagasDialog`. Nenhum
 * componente digita duração, curva, deslocamento nem passo de cascata: quem
 * anima lê daqui (mesma regra de `analyticsFunilAnimacao.ts` para o funil e de
 * `ui/entradaGlobal.ts` para a cascata de cards).
 *
 * ── O QUE ACONTECE, EM ORDEM (abertura) ─────────────────────────────────────
 *   0 ms      a linha cresce de altura 0 até a altura REAL do conteúdo
 *             (300 ms, `--ease-standard`) — as linhas de baixo descem junto,
 *             porque quem anima é a célula, não a caixa da janela;
 *   60 ms     o conteúdo do painel entra em fade (opacidade 0 → 1, 200 ms);
 *   60 ms     as cinco etapas entram em cascata curta: cada uma sobe 6 px até a
 *             posição final, com 28 ms entre uma e outra (0,14 s cada). A
 *             última termina em ~312 ms — dentro do mesmo compasso da dobra.
 *
 * ── POR QUE ESTA CURVA E ESTE TEMPO ────────────────────────────────────────
 * `--ease-standard` = `cubic-bezier(0.4, 0, 0.2, 1)` (bloco `@theme` de
 * `src/index.css`) é a curva SIMÉTRICA do sistema — acelera e desacelera nas
 * pontas, que é exatamente o que uma altura em expansão pede (a `ease-entrance`
 * das entradas de card desacelera só no fim e faria a dobra "arrancar").
 * 300 ms fica no meio da faixa 250–350 ms que `docs/motion-regua-global.md` §2
 * reserva para expandir/recolher.
 *
 * ── O QUE NÃO EXISTE AQUI ──────────────────────────────────────────────────
 * Nada de `scale`, mola, bounce ou overshoot: a linha cresce só em altura, o
 * conteúdo só em opacidade e as etapas só em `translateY`. Nenhum valor de cor,
 * tipografia, espaçamento ou dimensão do painel passa por este arquivo.
 *
 * ── MOVIMENTO REDUZIDO ─────────────────────────────────────────────────────
 * Com a preferência ligada (`lib/motionMode.ts`, fonte única do app) o
 * componente pede as variantes reduzidas: a altura ainda vai de 0 a `auto`
 * (senão o layout pularia), mas em 0,15 s, sem cascata e sem deslocamento —
 * conforme o padrão `..._SUAVE` já usado em `avaliacao/PerformanceAuditTimeline`.
 * ============================================================================
 */
import type { Variants } from 'framer-motion';

/**
 * `--ease-standard` do Design System, em tupla: é o formato que
 * `Transition['ease']` aceita (ver `docs/motion-regua-global.md` §3).
 */
export const CURVA_DOBRA: [number, number, number, number] = [0.4, 0, 0.2, 1];

/** Altura da linha: 0 → `auto`, 300 ms (faixa de expandir/recolher: 250–350 ms). */
export const DOBRA_DURACAO_S = 0.3;

/** Fade do conteúdo: começa depois que a linha já abriu um pouco. */
export const DOBRA_CONTEUDO_ATRASO_S = 0.06;
export const DOBRA_CONTEUDO_DURACAO_S = 0.2;

/** Saída do conteúdo: mais curta que a altura, para não sobrar "fantasma" no fim. */
export const DOBRA_SAIDA_DURACAO_S = 0.18;

/** Deslocamento vertical de entrada de cada etapa (px) — o "≈6 px" do pedido. */
export const ETAPA_DESLOCAMENTO_PX = 6;

/** Cascata das etapas: atraso inicial, passo e duração de cada uma (s). */
export const ETAPA_ATRASO_S = 0.06;
export const ETAPA_PASSO_S = 0.028;
export const ETAPA_DURACAO_S = 0.14;

/** Movimento reduzido: só a altura muda, e num compasso curto. */
export const DOBRA_DURACAO_REDUZIDA_S = 0.15;

/** As quatro peças animadas do detalhe (nomes de variante: `aberto`/`recolhido`). */
export interface VariantesDetalheVaga {
  /** A dobra: altura 0 ↔ `auto` (+ véu de opacidade próprio). */
  dobra: Variants;
  /** Superfície interna do painel: fade de entrada, sem deslocamento. */
  conteudo: Variants;
  /** Lista das etapas: só orquestra a cascata dos itens. */
  etapas: Variants;
  /** Cada etapa: fade + 6 px de deslocamento vertical. */
  etapa: Variants;
}

/**
 * Variantes da dobra, em função do modo de movimento. `reduzirMovimento` vem de
 * `useMovimentoReduzido()` no componente — este arquivo não lê preferência do
 * sistema (regra de `lib/motionMode.ts`).
 */
export function variantesDetalheVaga(reduzirMovimento: boolean): VariantesDetalheVaga {
  if (reduzirMovimento) {
    return {
      dobra: {
        recolhido: {
          height: 0,
          opacity: 0,
          transition: { duration: DOBRA_DURACAO_REDUZIDA_S, ease: CURVA_DOBRA },
        },
        aberto: {
          height: 'auto',
          opacity: 1,
          transition: { duration: DOBRA_DURACAO_REDUZIDA_S, ease: CURVA_DOBRA },
        },
      },
      conteudo: {
        recolhido: { opacity: 0, transition: { duration: DOBRA_DURACAO_REDUZIDA_S } },
        aberto: { opacity: 1, transition: { duration: DOBRA_DURACAO_REDUZIDA_S } },
      },
      // Sem cascata: a lista entra inteira no mesmo compasso.
      etapas: {
        recolhido: { transition: { staggerChildren: 0 } },
        aberto: { transition: { staggerChildren: 0, delayChildren: 0 } },
      },
      etapa: {
        recolhido: { opacity: 0, transition: { duration: DOBRA_DURACAO_REDUZIDA_S } },
        aberto: { opacity: 1, transition: { duration: DOBRA_DURACAO_REDUZIDA_S } },
      },
    };
  }

  return {
    dobra: {
      recolhido: {
        height: 0,
        opacity: 0,
        transition: {
          height: { duration: DOBRA_DURACAO_S, ease: CURVA_DOBRA },
          opacity: { duration: DOBRA_SAIDA_DURACAO_S, ease: CURVA_DOBRA },
        },
      },
      aberto: {
        height: 'auto',
        opacity: 1,
        transition: {
          height: { duration: DOBRA_DURACAO_S, ease: CURVA_DOBRA },
          opacity: {
            duration: DOBRA_CONTEUDO_DURACAO_S,
            ease: CURVA_DOBRA,
            delay: DOBRA_CONTEUDO_ATRASO_S,
          },
        },
      },
    },
    conteudo: {
      recolhido: {
        opacity: 0,
        transition: { duration: DOBRA_SAIDA_DURACAO_S, ease: CURVA_DOBRA },
      },
      aberto: {
        opacity: 1,
        transition: {
          duration: DOBRA_CONTEUDO_DURACAO_S,
          ease: CURVA_DOBRA,
          delay: DOBRA_CONTEUDO_ATRASO_S,
        },
      },
    },
    etapas: {
      // Na saída a cascata é inversa e mais curta: o recolhimento tem que
      // terminar dentro dos mesmos 300 ms da altura.
      recolhido: { transition: { staggerChildren: ETAPA_PASSO_S / 2, staggerDirection: -1 } },
      aberto: {
        transition: { staggerChildren: ETAPA_PASSO_S, delayChildren: ETAPA_ATRASO_S },
      },
    },
    etapa: {
      // Entra de 6 px ACIMA da posição final: a linha cresce para baixo, então
      // o conteúdo é "empurrado" para o lugar conforme a altura abre.
      recolhido: {
        opacity: 0,
        y: -ETAPA_DESLOCAMENTO_PX,
        transition: { duration: ETAPA_DURACAO_S, ease: CURVA_DOBRA },
      },
      aberto: {
        opacity: 1,
        y: 0,
        transition: { duration: ETAPA_DURACAO_S, ease: CURVA_DOBRA },
      },
    },
  };
}
