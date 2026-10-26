import { Timer } from 'lucide-react';
import { ETAPAS } from './pipelineEtapas';
import { TONS_PIPELINE } from './pipelineVisual';
import type { TempoEtapa } from './analyticsComum';
import { AnalyticsPainel } from './AnalyticsPainel';
import { cn } from '@/lib/utils';

/**
 * TEMPO POR ETAPA — permanência média desde a última movimentação registrada.
 *
 * Não é uma soma histórica de durações (o modelo não expõe `historico_etapas`
 * na leitura da página): é a idade média dos candidatos que ESTÃO na etapa.
 * O rodapé do painel deixa essa régua explícita para a leitura ser honesta.
 */
const ROTULO_CURTO: Record<string, string> = {
  triagem: 'Triagem',
  entrevista: 'Entrevista',
  teste: 'Teste',
  proposta: 'Proposta',
  contratado: 'Contratado',
};

export function AnalyticsTempo({ tempos, index }: { tempos: TempoEtapa[]; index: number }) {
  const temDados = tempos.some((tempo) => tempo.dias !== null);
  const iconePorEtapa = new Map(ETAPAS.map((etapa) => [etapa.id, etapa.icone]));
  const comDias = tempos.filter((tempo): tempo is TempoEtapa & { dias: number } => tempo.dias !== null);
  const maior = [...comDias].sort((a, b) => b.dias - a.dias)[0];
  const menor = [...comDias].sort((a, b) => a.dias - b.dias)[0];

  return (
    <AnalyticsPainel
      icon={Timer}
      title="Tempo médio por etapa"
      subtitle="Permanência média na etapa atual"
      tom="warning"
      index={index}
    >
      {!temDados ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/40 bg-background/30 px-4 py-7 text-center">
          <Timer className="h-5 w-5 text-muted-foreground/40" aria-hidden />
          <p className="text-[12px] font-medium text-foreground/80">Sem tempo registrado</p>
          <p className="max-w-[210px] text-[10.5px] leading-snug text-muted-foreground">
            A medição começa quando há candidatos em cada etapa.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {tempos.map((tempo) => {
              const tom = TONS_PIPELINE[tempo.id];
              const Icone = iconePorEtapa.get(tempo.id) ?? Timer;
              return (
                <div
                  key={tempo.id}
                  className="flex min-h-[86px] min-w-0 flex-col items-center justify-center rounded-xl border border-border/40 bg-background/40 px-1.5 py-2 text-center"
                  title={`${tempo.label}: ${tempo.dias ?? '—'} dias (${tempo.amostra} ${tempo.amostra === 1 ? 'candidato' : 'candidatos'})`}
                >
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-md border', tom.chip, tom.borda)}>
                    <Icone className="h-3 w-3" aria-hidden />
                  </span>
                  <span className="mt-1 w-full text-[9px] leading-tight text-muted-foreground">
                    {ROTULO_CURTO[tempo.id] ?? tempo.label}
                  </span>
                  <span className="mt-0.5 font-display text-[15px] font-semibold leading-none tabular-nums">
                    {tempo.dias ?? '—'}
                    {tempo.dias !== null && (
                      <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">d</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Extremos do período — leitura rápida de quem segura o funil. */}
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <div className="min-w-0 rounded-lg border border-border/40 bg-background/40 px-2 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-widest text-muted-foreground">
                Maior permanência
              </p>
              <p className="mt-0.5 truncate text-[10.5px] font-semibold leading-tight text-foreground">
                {maior?.label} · {maior?.dias}d
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-border/40 bg-background/40 px-2 py-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-widest text-muted-foreground">
                Menor permanência
              </p>
              <p className="mt-0.5 truncate text-[10.5px] font-semibold leading-tight text-foreground">
                {menor?.label} · {menor?.dias}d
              </p>
            </div>
          </div>

          <p className="mt-2 text-[9.5px] leading-snug text-muted-foreground">
            A maior permanência está em <span className="font-medium text-foreground/80">{maior?.label}</span>, com{' '}
            {maior?.amostra} {maior?.amostra === 1 ? 'candidato' : 'candidatos'} na etapa.
          </p>
          <p className="mt-1 text-[9px] leading-snug text-muted-foreground/70">
            {tempos.reduce((soma, tempo) => soma + tempo.amostra, 0)} candidaturas em{' '}
            {comDias.length} etapas monitoradas.
          </p>

          <p className="mt-auto pt-2.5 text-[10px] leading-snug text-muted-foreground">
            Dias desde a última movimentação registrada de quem está na etapa.
          </p>
        </>
      )}
    </AnalyticsPainel>
  );
}
