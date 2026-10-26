import { Briefcase } from 'lucide-react';
import { formatarPercentual, type DesempenhoVaga } from './analyticsComum';
import { AnalyticsPainel, ChipContagem } from './AnalyticsPainel';
import { cn } from '@/lib/utils';

/**
 * DESEMPENHO POR VAGA — candidatos e conversão, do maior volume para o menor.
 *
 * A barra representa a CONVERSÃO da vaga (contratados ÷ candidaturas), a mesma
 * leitura do percentual à direita; o volume aparece em “N cand.”. O ponto de
 * status diferencia vaga aberta de fechada sem esconder nenhuma delas.
 */
function tokenDaConversao(conversao: number): string {
  if (conversao >= 50) return '--success';
  if (conversao >= 20) return '--info';
  if (conversao > 0) return '--warning';
  return '--muted-foreground';
}

export function AnalyticsVagas({ vagas, index }: { vagas: DesempenhoVaga[]; index: number }) {
  const totalCandidaturas = vagas.reduce((soma, vaga) => soma + vaga.candidatos, 0);
  const abertas = vagas.filter((vaga) => vaga.status === 'aberta').length;

  return (
    <AnalyticsPainel
      icon={Briefcase}
      title="Desempenho por vaga"
      subtitle="Candidatos e conversão em cada processo"
      tom="success"
      index={index}
      action={<ChipContagem>{vagas.length} {vagas.length === 1 ? 'vaga' : 'vagas'}</ChipContagem>}
    >
      {vagas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/40 bg-background/30 px-4 py-7 text-center">
          <Briefcase className="h-5 w-5 text-muted-foreground/40" aria-hidden />
          <p className="text-[12px] font-medium text-foreground/80">Nenhuma vaga cadastrada</p>
          <p className="max-w-[210px] text-[10.5px] leading-snug text-muted-foreground">
            Publique uma vaga para acompanhar o desempenho por processo.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5" aria-label="Desempenho por vaga">
          {vagas.map((vaga) => {
            const token = tokenDaConversao(vaga.conversao);
            const aberta = vaga.status === 'aberta';
            return (
              <li key={vaga.id} className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className={cn('h-1.5 w-1.5 shrink-0 rounded-full', aberta ? 'bg-success' : 'bg-muted-foreground/40')}
                    title={aberta ? 'Vaga aberta' : 'Vaga fechada'}
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/85" title={vaga.titulo}>
                    {vaga.titulo}
                  </span>
                  <span className="w-9 shrink-0 text-right text-[10.5px] font-semibold tabular-nums text-foreground">
                    {formatarPercentual(vaga.conversao, 0)}
                  </span>
                </div>
                <div className="ml-3.5 mt-1 flex items-center gap-2">
                  <span aria-hidden className="block h-1 flex-1 overflow-hidden rounded-full bg-border/30">
                    <span
                      className="block h-full rounded-full transition-all duration-500"
                      style={{
                        width: vaga.conversao > 0 ? `${Math.max(3, Math.min(100, vaga.conversao))}%` : '0%',
                        background: `hsl(var(--${token}) / 0.85)`,
                      }}
                    />
                  </span>
                  <span className="shrink-0 text-[9.5px] tabular-nums text-muted-foreground">
                    {vaga.candidatos} cand.
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {vagas.length > 0 && (
        <p className="mt-auto pt-2.5 text-[10px] leading-snug text-muted-foreground">
          <span className="font-semibold text-foreground">{totalCandidaturas}</span> candidaturas em{' '}
          <span className="font-semibold text-foreground">{vagas.length}</span> vagas ·{' '}
          <span className="font-semibold text-foreground">{abertas}</span> abertas.
        </p>
      )}
    </AnalyticsPainel>
  );
}
