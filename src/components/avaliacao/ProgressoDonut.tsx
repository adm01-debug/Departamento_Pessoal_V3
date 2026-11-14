import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * DONUT DE PROGRESSO — indicador circular de UMA meta (aba "Metas & OKRs").
 *
 * POR QUE UM ANEL SVG PRÓPRIO (e não o `Pie` do card "Feedbacks por Status"):
 * aquele donut é uma PIZZA de DUAS fatias (concluídos vs. pendentes) com
 * legenda e percentual central próprios; aqui o dado é um único valor 0–100
 * por meta, repetido em cada card do grid. Reaproveitar a pizza exigiria
 * montar um `PieChart`/`ResponsiveContainer`/`ResizeObserver` por card (6 no
 * grid) para desenhar um arco — daí o anel em `stroke-dasharray`.
 *
 * A ANIMAÇÃO, porém, é a MESMA linguagem já aprovada no módulo: o arco é
 * preenchido por rAF em 1.400 ms (`ANIM_MS`, igual ao `ANIM_DONUT_MS` do card
 * analítico) com `easeOutCubic`, e o percentual central conta 0 → valor REAL
 * no MESMO intervalo — os dois saem sincronizados, e o último quadro sempre
 * escreve o número exato (nada de arredondamento acumulado). O disparo é por
 * visibilidade (`useInView`, `once: true`), como no card analítico, e com
 * movimento reduzido o anel já nasce cheio.
 * ============================================================================
 */

/**
 * Lado do quadro do donut (viewBox e renderização são 1:1 em px).
 *
 * DIMENSIONAMENTO: 84 px é o MAIOR valor que mantém a altura do card de meta
 * intacta — o miolo do card é `gap-2.5` (10 px) e a margem vertical negativa
 * `-my-2` (8 px) absorve o crescimento, deixando 2 px de folga para cada lado.
 * Crescer mais que isso empurraria a linha do card (proibido nesta rodada).
 */
const TAMANHO = 84;
/** Centro do quadro. */
const CENTRO = TAMANHO / 2;
/** Raio do traço dentro do viewBox de 84×84 (mesma margem interna da versão menor). */
const RAIO = 35;
/** Comprimento do anel (2πr) — base do `stroke-dasharray`. */
const PERIMETRO = 2 * Math.PI * RAIO;
/** Duração do preenchimento: a MESMA do donut analítico (`ANIM_DONUT_MS`). */
const ANIM_MS = 1400;
/**
 * Espessura do anel (px — o viewBox é renderizado 1:1).
 * 8/35 ≈ 0,23: mais encorpado que a versão anterior (7/35 = 0,20) para ganhar
 * presença no card, ainda longe de um anel grosso — a borda externa fica em
 * 35 + 4 = 39 px, dentro dos 42 px disponíveis (nenhum corte no quadro).
 */
const ESPESSURA = 8;

interface ProgressoDonutProps {
  /** Percentual final (0–100). */
  percentual: number;
  /** Classe de tinta do traço e do número (ex.: `text-success`) — via `currentColor`. */
  cor: string;
  /** Movimento reduzido: o anel já nasce preenchido, sem contagem. */
  reduzirMovimento?: boolean;
}

export function ProgressoDonut({ percentual, cor, reduzirMovimento = false }: ProgressoDonutProps) {
  const alvo = useRef<HTMLDivElement>(null);
  const emVista = useInView(alvo, { once: true, amount: 0.4 });
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (reduzirMovimento || !emVista) return;

    let raf = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const progresso = Math.min((agora - inicio) / ANIM_MS, 1);
      const suave = 1 - Math.pow(1 - progresso, 3); // easeOutCubic
      setValor(progresso < 1 ? percentual * suave : percentual);
      if (progresso < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [emVista, percentual, reduzirMovimento]);

  // Com movimento reduzido o anel já está no valor final, sem contagem.
  const atual = reduzirMovimento ? percentual : valor;
  const preenchido = Math.max(0, Math.min(100, atual));
  const deslocamento = PERIMETRO * (1 - preenchido / 100);

  return (
    <div
      ref={alvo}
      role="img"
      aria-label={`${percentual}% de progresso`}
      // `-my-2` absorve os 8 px que o donut cresceu acima/abaixo do slot de 64 px
      // original: a linha do card NÃO fica mais alta (ver `TAMANHO`).
      className="relative -my-2 shrink-0"
      style={{ width: TAMANHO, height: TAMANHO }}
    >
      <svg
        viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
        className="-rotate-90"
        style={{ width: TAMANHO, height: TAMANHO }}
        aria-hidden="true"
      >
        {/* Trilho: azul-marinho do tema (`--background`), como na referência. */}
        <circle
          cx={CENTRO}
          cy={CENTRO}
          r={RAIO}
          fill="none"
          strokeWidth={ESPESSURA}
          style={{ stroke: 'hsl(var(--background))' }}
        />
        <circle
          cx={CENTRO}
          cy={CENTRO}
          r={RAIO}
          fill="none"
          strokeWidth={ESPESSURA}
          strokeLinecap="round"
          strokeDasharray={PERIMETRO}
          strokeDashoffset={deslocamento}
          className={cn('stroke-current transition-[stroke] duration-300', cor)}
        />
      </svg>
      {/* Miolo: número e rótulo menores, com respiro real entre os dois.
          O bloco (17 px + 6 px + 9 px = 32 px) é centralizado no quadro de 84 px
          e cabe folgado no vão interno do anel (2 × (35 − 4) = 62 px), então o
          texto nunca toca o traço. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-display text-[17px] font-medium leading-none tabular-nums', cor)}>
          {Math.round(atual)}%
        </span>
        <span className="mt-1.5 text-[9px] leading-none text-muted-foreground">progresso</span>
      </div>
    </div>
  );
}
