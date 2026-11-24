/**
 * ============================================================================
 * CRESCIMENTO DAS BARRAS VERTICAIS — réplica da coreografia do card
 * "2. Visualize o impacto" (`premiacoes/RewardsSimulator.tsx`).
 *
 * O card de referência anima as colunas com `transform: scaleY()` (0 → 1),
 * `transform-origin: center bottom`, uma barra logo depois da outra, controlado
 * por `requestAnimationFrame`. Os números de lá são:
 *
 *   duração por barra : 900 ms               (`BARRA_CRESCIMENTO_MS`)
 *   intervalo         : 100 ms               (`BARRA_INTERVALO_MS`)
 *   curva             : ease-in-out senoidal (`easeInOutSine`)
 *
 * Este módulo reexporta EXATAMENTE esses números para os gráficos que precisam
 * do mesmo gesto (hoje o card "Horas Trabalhadas" do Controle de Ponto). Nada é
 * digitado de novo em cada tela — a paridade com o simulador é provada lendo o
 * fonte dele em `components/__tests__/PontoCardsMotion.test.ts`.
 *
 * ── POR QUE VARIÁVEL CSS (e não estado React) ──────────────────────────────
 * O Recharts redesenha os `<rect>` quando os dados, a largura do contêiner ou o
 * tooltip mudam. Se o progresso morasse em estado React (ou em `style` animado
 * pela Motion), cada redesenho recomeçaria a animação do zero — e o gráfico
 * "reanimaria" no hover. Com o progresso em variáveis CSS do CONTÊINER, um
 * `<rect>` recriado herda o valor atual: depois de concluída, a barra continua
 * na altura final, sem varredura nova e sem render por quadro no React.
 *
 * ── MOVIMENTO REDUZIDO ────────────────────────────────────────────────────
 * `reduzir` (sempre vindo de `lib/motionMode` → `useMovimentoReduzido()`, a
 * fonte única) monta as barras já na altura final: nada de espera, nada de
 * varredura. O padrão da variável CSS é `1`, então mesmo sem JavaScript (ou se
 * o controlador não rodar) a barra aparece cheia — nunca em zero.
 * ============================================================================
 */
import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react';

/** Duração do crescimento de UMA barra (900 ms) — igual ao simulador. */
export const CRESCIMENTO_BARRA_DURACAO_MS = 900;

/** Intervalo entre o início de uma barra e o da seguinte (100 ms). */
export const CRESCIMENTO_BARRA_INTERVALO_MS = 100;

/** Progresso limitado a 0–1 (protege a curva de valores fora da faixa). */
function limitar01(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(Math.max(valor, 0), 1);
}

/**
 * Curva da referência: ease-in-out senoidal. Sai devagar, acelera no meio e
 * freia no fim — o mesmo `-(cos(πt) - 1) / 2` do simulador, escrito como
 * `(1 - cos(πt)) / 2` para não devolver `-0` no início da varredura.
 */
export function easeInOutSine(progresso: number): number {
  return (1 - Math.cos(Math.PI * limitar01(progresso))) / 2;
}

/** Tempo total da coreografia para `total` barras (última barra inclusa). */
export function duracaoTotalCrescimento(total: number): number {
  const barras = Math.max(0, Math.floor(total));
  if (barras === 0) return 0;
  return CRESCIMENTO_BARRA_DURACAO_MS + (barras - 1) * CRESCIMENTO_BARRA_INTERVALO_MS;
}

/** Nome da variável CSS que guarda o progresso (0–1) da barra `indice`. */
export function variavelCrescimentoBarra(indice: number): string {
  return `--crescimento-barra-${Math.max(0, Math.floor(indice))}`;
}

/**
 * `style` do `<rect>` da barra: cresce a partir da BASE do próprio desenho.
 *
 * `transform-box: fill-box` faz a origem ser a caixa do `<rect>` (e não o
 * `viewBox` do SVG), então `center bottom` é o pé da barra; sem isso o
 * `scaleY` encolheria em direção ao centro do gráfico. O padrão `1` da variável
 * é o estado "já crescida" — segurança para quando não há animação.
 */
export function estiloCrescimentoBarra(indice: number): CSSProperties {
  return {
    transformBox: 'fill-box',
    transformOrigin: 'center bottom',
    transform: `scaleY(var(${variavelCrescimentoBarra(indice)}, 1))`,
  };
}

export interface OpcoesCrescimentoBarras {
  /** Quantas barras o gráfico desenhou (tamanho da série). */
  total: number;
  /**
   * `false` mantém as barras em zero (aguardando a entrada do CARD terminar).
   * Quem liga é o `onAnimationComplete` da casca — ver
   * `hooks/useEntradaCardConcluida.ts`.
   */
  ativo?: boolean;
  /** Movimento reduzido: barras já na altura final, sem varredura. */
  reduzir?: boolean;
}

/**
 * Controlador do crescimento — devolve o `ref` do contêiner do gráfico.
 *
 * Escreve `--crescimento-barra-<i>` (0 → 1) nas barras, em cascata, uma única
 * vez: `executou` vira `true` ao terminar e nenhum efeito posterior (hover,
 * tooltip, refetch, re-render) reinicia a animação. Quando a série muda de
 * tamanho depois disso, as barras novas já nascem na altura final.
 */
export function useCrescimentoBarras({
  total,
  ativo = true,
  reduzir = false,
}: OpcoesCrescimentoBarras): RefObject<HTMLDivElement | null> {
  const alvoRef = useRef<HTMLDivElement | null>(null);
  const quadroRef = useRef<number | null>(null);
  const executouRef = useRef(false);
  const valoresRef = useRef<number[]>([]);

  const cancelar = useCallback(() => {
    if (quadroRef.current !== null) {
      cancelAnimationFrame(quadroRef.current);
      quadroRef.current = null;
    }
  }, []);

  /**
   * Estado inicial ANTES do primeiro quadro pintado. Sem isso a barra nasceria
   * cheia (padrão `1` da variável) e piscaria para zero no primeiro `rAF`.
   *
   * Roda também quando a série muda de tamanho: antes de a animação acontecer,
   * zera as barras; depois de acontecer, mantém todas na altura final.
   */
  useLayoutEffect(() => {
    const alvo = alvoRef.current;
    const barras = Math.max(0, Math.floor(total));
    const inicial = executouRef.current ? 1 : 0;
    valoresRef.current = Array.from({ length: barras }, () => inicial);
    if (!alvo) return;
    for (let indice = 0; indice < barras; indice += 1) {
      alvo.style.setProperty(variavelCrescimentoBarra(indice), inicial.toFixed(4));
    }
  }, [total]);

  useEffect(() => {
    if (!ativo || executouRef.current) return;
    const alvo = alvoRef.current;
    const barras = Math.max(0, Math.floor(total));
    if (!alvo || barras === 0) return;

    // Movimento reduzido: tudo na altura final, sem espera e sem varredura.
    if (reduzir) {
      for (let indice = 0; indice < barras; indice += 1) {
        alvo.style.setProperty(variavelCrescimentoBarra(indice), '1');
      }
      valoresRef.current = Array.from({ length: barras }, () => 1);
      executouRef.current = true;
      return;
    }

    let inicio: number | null = null;

    const passo = (agora: number) => {
      // O gráfico foi remontado (outro contêiner): esta execução morreu.
      if (alvoRef.current !== alvo) {
        quadroRef.current = null;
        return;
      }
      if (inicio === null) inicio = agora;
      const decorrido = agora - inicio;

      for (let indice = 0; indice < barras; indice += 1) {
        // Cada barra parte `intervalo` depois da anterior (cascata).
        const progresso = easeInOutSine(
          (decorrido - indice * CRESCIMENTO_BARRA_INTERVALO_MS) / CRESCIMENTO_BARRA_DURACAO_MS
        );
        if (progresso === valoresRef.current[indice]) continue;
        valoresRef.current[indice] = progresso;
        alvo.style.setProperty(variavelCrescimentoBarra(indice), progresso.toFixed(4));
      }

      if (decorrido < duracaoTotalCrescimento(barras)) {
        quadroRef.current = requestAnimationFrame(passo);
        return;
      }

      // Fim: alturas finais preservadas (nunca fica barra em 0).
      for (let indice = 0; indice < barras; indice += 1) {
        alvo.style.setProperty(variavelCrescimentoBarra(indice), '1');
      }
      valoresRef.current = Array.from({ length: barras }, () => 1);
      quadroRef.current = null;
      executouRef.current = true;
    };

    // Dois quadros: um para o zero ser efetivamente pintado, outro para contar.
    quadroRef.current = requestAnimationFrame(() => {
      quadroRef.current = requestAnimationFrame(passo);
    });

    return cancelar;
  }, [ativo, reduzir, total, cancelar]);

  return alvoRef;
}
