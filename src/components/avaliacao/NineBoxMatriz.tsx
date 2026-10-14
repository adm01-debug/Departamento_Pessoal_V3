import { Fragment } from 'react';
import { motion, type TargetAndTransition } from 'framer-motion';
import { Info, LayoutGrid } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { entradaCard, MAX_ENTRADA_INDEX } from './entradaCards';
import { NineBoxQuadrante, type EntradaQuadrante } from './NineBoxQuadrante';
import { ROTULO_FAIXA, type FaixaScore, type PontoNineBox, type QuadranteKey } from './nineBoxComum';

/**
 * ============================================================================
 * MATRIZ NINE-BOX 3×3 — bloco principal da aba.
 *
 * Composição da referência: título disciplinado no topo (com o tooltip que já
 * existia explicando os eixos), o eixo POTENCIAL na vertical (alto → baixo) e o
 * eixo DESEMPENHO na horizontal (baixo → alto) — a mesma leitura do componente
 * anterior, agora com as células em tokens do tema.
 *
 * RESPONSIVIDADE: acima de `sm` a grade é `[faixa] + 3 colunas`; abaixo, os nove
 * quadrantes empilham em uma coluna e os rótulos de eixo somem (sem overflow
 * horizontal em tela estreita).
 *
 * ── COREORAFIA DE ENTRADA (mesma família `entradaCard` do resto do sistema) ──
 * A cena inteira é um `Variants` encadeado: o wrapper da grade declara
 * `delayChildren` igual ao atraso do próprio card (`indice * 0.08`, com o teto
 * `MAX_ENTRADA_INDEX`), então a cascata interna começa exatamente quando o card
 * termina de entrar — nunca "roda escondida". A sequência:
 *   1. ENIGMA (card âncora) — scale-in 0,85 → 1 + fade;
 *   2. ALTO POTENCIAL + ESTRELA deslizam da esquerda (x −50 → 0), em paralelo;
 *   3. linha do MEIO (Dilema/Core Player/Alto Profissional) desce em bloco (y −34);
 *   4. linha de BAIXO (Sub-performer/Efetivo/Profissional Confiável) desce em bloco;
 *   5. em paralelo, os EIXOS são desenhados (scaleY/scaleX desde a origem) e as
 *      PONTAS e os RÓTULOS surgem com fade + leve scale.
 * Só `transform`/`opacity` são animados (nenhum reflow → a grade não quebra) e
 * nada anima em loop.
 * ============================================================================
 */

const FAIXAS_POTENCIAL: FaixaScore[] = [3, 2, 1];
const FAIXAS_DESEMPENHO: FaixaScore[] = [1, 2, 3];

/** Mesmo easing dos KPI Cards (`cardVariants`) — a coreografia é a mesma família. */
const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

/** Tempos da sequência, em segundos, relativos ao início da cena.
 *  Encadeados: cada etapa começa quando a anterior termina (ver `T.*Delay`). */
const T = {
  enigma: 0.46,
  linha1Dur: 0.46,
  linha1Delay: 0.46,
  linhaDur: 0.4,
  meioDelay: 0.92,
  baseDelay: 1.32,
  eixoDur: 0.75,
  pontaDur: 0.28,
  pontaDelay: 0.56,
  rotuloDur: 0.35,
  rotuloDelay: 0.38,
};

/** Entrada padrão: fade + deslocamento/scale opcionais, com o atraso do CARD já
 *  somado — assim a cascata interna nunca roda antes de o card aparecer. */
function entrada(de: TargetAndTransition, dur: number, atraso: number, delay: number): EntradaQuadrante {
  return {
    initial: { opacity: 0, ...de },
    animate: { opacity: 1, scale: 1, x: 0, y: 0 },
    transition: { duration: dur, delay: atraso + delay, ease: EASE },
  };
}

/** Entrada de cada quadrante, pela posição que ele ocupa na coreografia. */
function entradaDoQuadrante(chave: QuadranteKey, pot: FaixaScore, atraso: number): EntradaQuadrante {
  if (chave === '1-3') return entrada({ scale: 0.85 }, T.enigma, atraso, 0); // âncora
  if (pot === 3) return entrada({ x: -50 }, T.linha1Dur, atraso, T.linha1Delay); // 1ª linha
  if (pot === 2) return entrada({ y: -34 }, T.linhaDur, atraso, T.meioDelay); // 2ª linha
  return entrada({ y: -34 }, T.linhaDur, atraso, T.baseDelay); // 3ª linha
}

interface NineBoxMatrizProps {
  /** Pessoas de cada quadrante (contagem calculada em `nineBoxComum`). */
  porQuadrante: (chave: QuadranteKey) => PontoNineBox[];
  indice?: number;
  onAbrirQuadrante?: (chave: QuadranteKey) => void;
}

export function NineBoxMatriz({ porQuadrante, indice = 3, onAbrirQuadrante }: NineBoxMatrizProps) {
  // Atraso do próprio card (`entradaCard`: `indice * 0.08`, com teto). Toda a
  // cascata interna soma este valor, então ela só começa quando o card chega.
  const atraso = Math.min(Math.max(indice, 0), MAX_ENTRADA_INDEX) * 0.08;
  const eEixoY: EntradaQuadrante = {
    initial: { scaleY: 0 },
    animate: { scaleY: 1 },
    transition: { duration: T.eixoDur, delay: atraso, ease: EASE },
  };
  const eEixoX: EntradaQuadrante = {
    initial: { scaleX: 0 },
    animate: { scaleX: 1 },
    transition: { duration: T.eixoDur, delay: atraso, ease: EASE },
  };
  const ePonta = entrada({ scale: 0.55 }, T.pontaDur, atraso, T.pontaDelay);
  const eRotulo = entrada({ scale: 0.92 }, T.rotuloDur, atraso, T.rotuloDelay);
  // O rótulo "Potencial" já tem `x/y/rotate` no `style` — o `animate` não pode
  // repetir x/y, senão o Framer zera o posicionamento rotacionado.
  const eRotuloPot: EntradaQuadrante = {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: T.rotuloDur, delay: atraso + T.rotuloDelay, ease: EASE },
  };
  return (
    <motion.div
      {...entradaCard(indice)}
      className="min-w-0 self-start rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/60 p-3 shadow-elevated"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-[13px] font-semibold leading-tight tracking-tight">
            <LayoutGrid className="h-4 w-4 shrink-0 text-primary" />
            Matriz Nine-Box 10/10
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Mapeamento estratégico de talentos por desempenho e potencial
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Como ler a matriz"
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Eixo horizontal: Desempenho (efetividade nas metas).
              <br />
              Eixo vertical: Potencial (capacidade de assumir novos desafios).
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="relative flex min-w-0 gap-1">
        {/* Eixo Y — título do eixo (rotacionado), só a partir de `sm`. */}
        <div className="relative hidden w-4 shrink-0 sm:block">
          {/* Rótulo do eixo: fade + leve scale (rotate/translate via Framer para
              não conflitar com o `transform` que a animação escreve). */}
          <motion.span
            {...eRotuloPot}
            style={{ x: '-50%', y: '-50%', rotate: -90 }}
            className="absolute left-1/2 top-1/2 whitespace-nowrap text-[9px] font-medium uppercase tracking-widest text-muted-foreground/70"
          >
            Potencial
          </motion.span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Grade única: [rótulo da faixa] · [linha do eixo Y] · [3 colunas de
              quadrantes]. As linhas/setas dos eixos são ITENS do próprio grid
              (coluna/linha próprias) — nada de `position:absolute` por cima dos
              cards, então nada sobrepõe os nove quadrantes. */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1rem_repeat(3,minmax(0,1fr))]">
            {/* Eixo Y — LINHA + PONTA do MESMO traço (2,5px, mesma cor).
                Vive na coluna exclusiva do eixo (16px = 1rem), centrado nela.
                A linha sobe do fundo (origem) até a ponta; a ponta é um chevron
                SVG de 2,5px cujo vértice cai EXATAMENTE no topo da linha (12px
                abaixo do topo do grid = margem de segurança). */}
            <div
              aria-hidden
              className="relative hidden overflow-visible sm:block"
              style={{ gridColumn: 2, gridRow: '1 / 5' }}
            >
              {/* A linha nasce num PONTO na origem e cresce para cima
                  (`scaleY` + `origin-bottom`). O wrapper carrega o `-translate-x`
                  para o `transform` da animação não brigar com ele. */}
              <span className="absolute bottom-0 left-1/2 top-3 -translate-x-1/2">
                <motion.span {...eEixoY} className="block h-full w-[2.5px] origin-bottom bg-muted-foreground/60" />
              </span>
              {/* Ponta em SVG (2,5px) com o VÉRTICE no centro do viewBox; surge no
                  fim do crescimento (fade + leve scale). */}
              <span className="absolute left-1/2 top-3 -translate-x-1/2 -translate-y-1/2">
                <motion.svg
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  {...ePonta}
                  className="block h-3 w-3 overflow-visible text-muted-foreground/60"
                >
                  <path d="M1 11 6 6 11 11" />
                </motion.svg>
              </span>
            </div>

            {FAIXAS_POTENCIAL.map((pot) => (
              <Fragment key={`linha-${pot}`}>
                <div className="hidden items-center justify-end pr-1 sm:flex">
                  <motion.span
                    {...eRotulo}
                    className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {ROTULO_FAIXA[pot]}
                  </motion.span>
                </div>
                {FAIXAS_DESEMPENHO.map((perf) => {
                  const chave = `${perf}-${pot}` as QuadranteKey;
                  return (
                    <NineBoxQuadrante
                      key={chave}
                      chave={chave}
                      pessoas={porQuadrante(chave)}
                      onAbrir={onAbrirQuadrante}
                      entrada={entradaDoQuadrante(chave, pot, atraso)}
                    />
                  );
                })}
              </Fragment>
            ))}

          {/* Eixo X — LINHA + PONTA do MESMO traço (2,5px, mesma cor). Começa no
              centro da coluna do eixo (onde a vertical termina = origem) e segue
              até a ponta. O `mt-2.5` (10px) soma-se ao `gap-2` da grade e afasta a
              linha ~18px da última fileira de quadrantes. */}
            <div
              aria-hidden
              className="relative mt-2.5 hidden h-0 overflow-visible sm:block"
              style={{ gridColumn: '2 / 6', gridRow: 4 }}
            >
              {/* A linha nasce num PONTO na origem e cresce para a direita
                  (`scaleX` + `origin-left`). */}
              <motion.span
                {...eEixoX}
                className="absolute left-2 right-5 top-0 h-[2.5px] origin-left bg-muted-foreground/60"
              />
              {/* Ponta em SVG (2,5px) que surge no fim do crescimento. */}
              <span className="absolute right-3.5 top-0 -translate-y-[calc(50%-1.25px)]">
                <motion.svg
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  {...ePonta}
                  className="block h-3 w-3 overflow-visible text-muted-foreground/60"
                >
                  <path d="M1 1 6 6 1 11" />
                </motion.svg>
              </span>
            </div>

            {/* Eixo X — rótulos BAIXO/MÉDIO/ALTO, um por coluna de quadrante. */}
            {FAIXAS_DESEMPENHO.map((perf, c) => (
              <div
                key={`coluna-${perf}`}
                className="hidden justify-center sm:flex"
                style={{ gridColumn: c + 3, gridRow: 5 }}
              >
                <motion.span
                  {...eRotulo}
                  className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {ROTULO_FAIXA[perf]}
                </motion.span>
              </div>
            ))}

            {/* Título do eixo X, centralizado sob os nove quadrantes. */}
            <div
              className="hidden justify-center sm:flex"
              style={{ gridColumn: '3 / 6', gridRow: 6 }}
            >
              <motion.span
                {...eRotulo}
                className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground/70"
              >
                Desempenho
              </motion.span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
