/**
 * ============================================================================
 * CARD "EVOLUÇÃO DO SALDO" — a curva acumulada do recorte.
 *
 *   ┌───────────────────────────────────────────────┐
 *   │ (↗) Evolução do saldo              5 dias     │
 *   │     Acumulado dia a dia no período            │
 *   ├───────────────────────────────────────────────┤
 *   │   ╱╲                                          │
 *   │  ╱  ╲___                                      │
 *   │ ───────── 0 ─────────────────────────────     │
 *   │ ───────────────────────────────────────────   │
 *   │ Saldo no fim do período            +12h30     │
 *   └───────────────────────────────────────────────┘
 *
 * ── A SÉRIE ─────────────────────────────────────────────────────────────────
 * `evolucaoSaldo(registrosDoRecorte)`: um ponto por dia COM movimentação, saldo
 * acumulado desde zero. O último ponto é exatamente o "Saldo do período" dos
 * KPI Cards 2–4 — se os dois números divergirem, é bug, não arredondamento.
 * Não há seed com `saldo_anterior` (é o saldo de UMA pessoa; semear a curva da
 * equipe com ele misturaria dívida individual com movimento coletivo).
 *
 * ── DESENHO E MOVIMENTO ─────────────────────────────────────────────────────
 * `AreaChart`/`Area` do Recharts com degradê do token `--primary` (mesmo padrão
 * de `dashboard/HeadcountOverviewCard.tsx`). Quem anima é o
 * `ClipRevelacaoGrafico` (`ui/revelacaoGrafico.tsx`, fonte única do gesto):
 * varredura de 2,5 s da esquerda para a direita, disparada só depois que a
 * entrada do card terminou (`useEntradaCardConcluida`) — nunca escondida atrás
 * do fade. `isAnimationActive={false}` na `<Area>`, porque a animação nativa do
 * Recharts brigaria com o clip pelo mesmo traçado.
 * A linha tracejada em zero só aparece quando existe saldo negativo na série:
 * é ela que dá sentido ao "abaixo de zero" da curva.
 * ============================================================================
 */
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { ClipRevelacaoGrafico } from '@/components/ui/revelacaoGrafico';
import { TooltipGrafico, CLASSE_ENTRADA_TOOLTIP } from '@/components/ui/tooltipGrafico';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { cn } from '@/lib/utils';
import { formatarHorasBanco, type PontoEvolucao } from './bancoHorasComum';
import { CartaoSecaoBancoHoras } from './CartaoSecaoBancoHoras';

export interface EvolucaoSaldoCardProps {
  /** Pontos do recorte selecionado (`evolucaoSaldo`). */
  pontos: readonly PontoEvolucao[];
  /** Posição na BANDA DE CONTEÚDO da fila única de entrada. */
  index?: number;
}

/** `YYYY-MM-DD` → `dd/mm/aaaa` para o cabeçalho da tooltip. */
function dataLonga(data: string): string {
  const casamento = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  return casamento ? `${casamento[3]}/${casamento[2]}/${casamento[1]}` : data;
}

/**
 * Conteúdo da tooltip: data no cabeçalho, saldo acumulado e variação do dia.
 *
 * As medidas em `rem` acompanham a escala global do Design System (base 20px),
 * como no card de horas trabalhadas do Ponto — o bloco precisa caber no gráfico
 * (mínimo de 80 px, que cresce com a coluna) sem cobri-lo.
 */
function TooltipEvolucaoSaldo({ active, payload }: { active?: boolean; payload?: Array<{ payload?: PontoEvolucao }> }) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0]?.payload as PontoEvolucao | undefined;
  if (!ponto) return null;

  return (
    <div
      className={cn(
        'rounded-[0.5rem] border border-border/70 bg-background px-2.5 py-2 shadow-lg',
        CLASSE_ENTRADA_TOOLTIP
      )}
    >
      <p className="font-body text-[10px] font-medium leading-none text-muted-foreground">{dataLonga(ponto.data)}</p>
      <div className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap">
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
        <span className="font-body text-[10px] leading-none text-muted-foreground">Saldo acumulado</span>
        <span className="font-display text-[12px] font-semibold leading-none tabular-nums text-foreground">
          {formatarHorasBanco(ponto.saldo)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 whitespace-nowrap">
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ponto.variacao < 0 ? 'bg-destructive' : 'bg-success')}
        />
        <span className="font-body text-[10px] leading-none text-muted-foreground">Variação do dia</span>
        <span className="font-display text-[10px] font-medium leading-none tabular-nums text-foreground">
          {formatarHorasBanco(ponto.variacao)}
        </span>
      </div>
    </div>
  );
}

export function EvolucaoSaldoCard({ pontos, index = 0 }: EvolucaoSaldoCardProps) {
  const movimentoReduzido = useMovimentoReduzido();
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(index);

  const { serie, menor, temNegativo, saldoFinal } = useMemo(() => {
    const lista = pontos.map((ponto) => ({ ...ponto }));
    const valores = lista.map((ponto) => ponto.saldo);
    return {
      serie: lista,
      // O eixo precisa cobrir o zero: uma curva que só desce ficaria colada no
      // topo se o domínio começasse no menor valor.
      menor: valores.length > 0 ? Math.min(0, ...valores) : 0,
      temNegativo: valores.some((valor) => valor < 0),
      saldoFinal: lista.length > 0 ? lista[lista.length - 1].saldo : 0,
    };
  }, [pontos]);

  return (
    <CartaoSecaoBancoHoras
      id="banco-horas-evolucao"
      icone={TrendingUp}
      tom="bg-primary/15 text-primary"
      titulo="Evolução do saldo"
      subtitulo="Acumulado dia a dia no recorte"
      index={index}
      esticar
      aoConcluirEntrada={aoConcluirEntrada}
      acessorio={
        serie.length > 0 ? (
          <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
            {serie.length === 1 ? '1 dia' : `${serie.length} dias`}
          </p>
        ) : undefined
      }
    >
      {serie.length > 0 ? (
        <>
          {/*
            ALTURA PRÓPRIA — o Recharts recebe `height: 100%`, e para isso o pai
            precisa de altura DEFINIDA. `min-h-[80px] flex-1` não dava: com só
            `min-height`, o `<svg>` colapsava para 0 px. `h-[80px]` (5 rem = os
            100 px de antes) resolve a altura-base e `grow` — no lugar de
            `flex-1`, que troca a base por 0 — absorve a sobra quando a coluna
            fica mais alta que o conteúdo: é o caso em que o EXTRATO passa a
            ditar a altura da linha da grade (muitas linhas por página) e este
            card, último da pilha (`esticar`), cresce para fechar o alinhamento.
          */}
          <div className="h-[80px] w-full min-w-0 grow">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="bh-grad-saldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  {/* A varredura da esquerda para a direita é a régua única de
                      `ui/revelacaoGrafico.tsx`; ela só começa quando a entrada
                      do card acabou (nunca escondida atrás do fade). */}
                  <ClipRevelacaoGrafico
                    id="bh-evolucao-reveal-clip"
                    animar={entradaConcluida}
                    semMovimento={movimentoReduzido}
                    chave={serie.length}
                  />
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.7} strokeDasharray="3 3" />
                <XAxis
                  dataKey="eixo"
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={12}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  domain={[menor, 'auto']}
                  tickFormatter={(valor: number) => `${Math.round(valor)}h`}
                />
                {/* Linha do zero: só faz sentido quando a série mergulha nela. */}
                {temNegativo && (
                  <ReferenceLine
                    y={0}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                )}
                <TooltipGrafico content={<TooltipEvolucaoSaldo />} />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo acumulado"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#bh-grad-saldo)"
                  dot={{ r: 2.5, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                  clipPath="url(#bh-evolucao-reveal-clip)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-[7px] flex shrink-0 items-center justify-between gap-[10px] border-t border-border/40 pt-[6px]">
            <p className="text-[11px] text-muted-foreground">Saldo no fim do recorte</p>
            <p
              className={cn(
                'text-[13px] font-semibold tabular-nums',
                saldoFinal < 0 ? 'text-destructive' : 'text-foreground'
              )}
            >
              {formatarHorasBanco(saldoFinal)}
            </p>
          </div>
        </>
      ) : (
        <div className="flex min-h-[96px] flex-1 items-center justify-center rounded-[9px] border border-dashed border-border/60">
          <p className="text-[11px] text-muted-foreground">Sem movimento no recorte selecionado.</p>
        </div>
      )}
    </CartaoSecaoBancoHoras>
  );
}
