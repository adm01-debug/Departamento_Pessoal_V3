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
 * DIMENSIONAMENTO: 96 px. A versão anterior (84 px) nasceu ANTES da escala
 * global de 125% (`html { font-size: 125% }` em `index.css`) e por isso ficou
 * desproporcional: o anel continuou com 84 px absolutos enquanto o miolo de
 * texto cresceu junto com a densidade do sistema — o percentual e o rótulo
 * "progresso" passaram a encostar/cruzar o traço. Com 96 px o VÃO interno
 * (2 × (39 − 4,5) = 69 px) volta a acomodar o texto com folga real.
 *
 * ALTURA DO CARD: a margem vertical negativa `-my-2` (10 px de cada lado na
 * base de 20 px) absorve o crescimento; o quadro contribui com 76 px de layout
 * e transborda apenas 10 px para cima/baixo, dentro do `gap-2.5` (12,5 px) que
 * separa as regiões do card — nenhuma sobreposição com título ou rodapé.
 */
const TAMANHO = 96;
/** Centro do quadro. */
const CENTRO = TAMANHO / 2;
/** Raio do traço dentro do viewBox de 96×96 (mesma margem interna da versão menor). */
const RAIO = 39;
/** Comprimento do anel (2πr) — base do `stroke-dasharray`. */
const PERIMETRO = 2 * Math.PI * RAIO;
/** Duração do preenchimento: a MESMA do donut analítico (`ANIM_DONUT_MS`). */
const ANIM_MS = 1400;
/**
 * Espessura do anel (px — o viewBox é renderizado 1:1).
 * 9/39 ≈ 0,23: mesma proporção da versão anterior (8/35), agora sobre um raio
 * maior — a borda externa fica em 39 + 4,5 = 43,5 px, dentro dos 48 px
 * disponíveis (nenhum corte no quadro).
 */
const ESPESSURA = 9;

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
      // `-my-2` absorve a maior parte dos 96 px do quadro: o layout enxerga
      // 76 px e o transbordo de 10 px para cima/baixo fica dentro do `gap-2.5`
      // (12,5 px) entre as regiões do card — ver `TAMANHO`.
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
      {/* Miolo: número e rótulo proporcionais ao VÃO interno do anel.
          Número: 14 px de classe (17,5 px na base de 20 px — antes eram 21,25 px,
          que quase preenchia o vão). Rótulo: 8 px de classe (10 px efetivos —
          antes 11,25 px, mais largo que o vão na altura em que o texto fica e
          por isso cruzava o traço). O bloco (17,5 + 5 + 10 ≈ 33 px) é
          centralizado no quadro de 96 px e cabe folgado nos 69 px internos. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-display text-[14px] font-medium leading-none tabular-nums', cor)}>
          {Math.round(atual)}%
        </span>
        <span className="mt-1 text-[8px] leading-none text-muted-foreground">progresso</span>
      </div>
    </div>
  );
}
