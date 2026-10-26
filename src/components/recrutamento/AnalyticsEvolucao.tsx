import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartNoAxesCombined } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CandidaturaComRelacoes } from '@/types/recrutamento';
import { construirEvolucao, type PontoEvolucao } from './analyticsComum';
import { AnalyticsPainel } from './AnalyticsPainel';

/**
 * EVOLUÇÃO DE CANDIDATURAS — área (candidaturas) + linha (contratações).
 *
 * O recorte é local (3/6/12 meses) e termina no mês da data de referência da
 * base. O gráfico usa só tokens do sistema (`--info`, `--success`, `--border`,
 * `--muted-foreground`) e o mesmo casco dos demais painéis. Sem dados, mostra
 * um estado vazio curto em vez de um eixo vazio.
 */

const PERIODOS = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
] as const;

type ItemTooltip = { name?: string; value?: number | string; color?: string };

function TooltipEvolucao({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: ItemTooltip[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-popover px-3 py-2 text-popover-foreground shadow-xl">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-1.5 text-[11px] leading-relaxed">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-semibold tabular-nums text-foreground">{item.value}</span>
        </p>
      ))}
    </div>
  );
}

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: cor }} />
      {label}
    </span>
  );
}

export function AnalyticsEvolucao({
  candidaturas,
  referencia,
  index,
}: {
  candidaturas: CandidaturaComRelacoes[];
  referencia: Date;
  index: number;
}) {
  const [meses, setMeses] = useState<number>(6);
  const serie: PontoEvolucao[] = useMemo(
    () => construirEvolucao(candidaturas, meses, referencia),
    [candidaturas, meses, referencia]
  );
  const temDados = serie.some((ponto) => ponto.candidaturas > 0 || ponto.contratacoes > 0);

  return (
    <AnalyticsPainel
      icon={ChartNoAxesCombined}
      title="Evolução de candidaturas"
      subtitle={`Candidaturas e contratações · ${meses} meses`}
      tom="info"
      index={index}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Legenda cor="hsl(var(--info))" label="Candidaturas" />
          <Legenda cor="hsl(var(--success))" label="Contratações" />
        </div>
        <Select value={String(meses)} onValueChange={(valor) => setMeses(Number(valor))}>
          <SelectTrigger
            aria-label="Período da evolução de candidaturas"
            className="h-6 w-[88px] rounded-lg border-border/40 bg-background/40 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PERIODOS.map((periodo) => (
              <SelectItem key={periodo.value} value={String(periodo.value)} className="text-[11.5px]">
                {periodo.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!temDados ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/40 bg-background/30 px-4 py-8 text-center">
          <ChartNoAxesCombined className="h-5 w-5 text-muted-foreground/40" aria-hidden />
          <p className="text-[12px] font-medium text-foreground/80">Sem movimentações no período</p>
          <p className="max-w-[240px] text-[10.5px] leading-snug text-muted-foreground">
            Escolha outro recorte ou acompanhe a evolução quando novas candidaturas entrarem.
          </p>
        </div>
      ) : (
        <div className="relative mt-1 min-h-[190px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="recrutamento-evolucao-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="rotulo"
                tickLine={false}
                axisLine={false}
                dy={5}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={30}
                allowDecimals={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--info))', strokeDasharray: '4 4', strokeOpacity: 0.6 }}
                content={<TooltipEvolucao />}
              />
              <Area
                type="monotone"
                dataKey="candidaturas"
                name="Candidaturas"
                stroke="hsl(var(--info))"
                strokeWidth={2}
                fill="url(#recrutamento-evolucao-fill)"
                dot={{ r: 2, fill: 'hsl(var(--info))', strokeWidth: 0 }}
                activeDot={{ r: 4, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="contratacoes"
                name="Contratações"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={{ r: 2, fill: 'hsl(var(--success))', strokeWidth: 0 }}
                activeDot={{ r: 4, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </AnalyticsPainel>
  );
}
