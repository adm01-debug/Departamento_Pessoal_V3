import { AlertTriangle, Briefcase, CircleCheck, Timer, TrendingDown, UserMinus, type LucideIcon } from 'lucide-react';
import type { PontoAtencao, SeveridadeAtencao } from './analyticsComum';
import { AnalyticsPainel, ChipContagem } from './AnalyticsPainel';
import { cn } from '@/lib/utils';

/**
 * PONTOS DE ATENÇÃO — insights acionáveis derivados do próprio funil.
 *
 * As regras estão em `analyticsComum.construirPontosDeAtencao`: permanência
 * acima de 21 dias, vaga aberta parada há mais de 15 dias, menor conversão e
 * desistências registradas. Não há IA nem texto fixo: sem alerta derivado, o
 * painel mostra um estado positivo compacto.
 */
const ESTILO_SEVERIDADE: Record<SeveridadeAtencao, string> = {
  alta: 'border-destructive-vivid/25 bg-destructive-vivid/10 text-destructive-vivid',
  media: 'border-warning/25 bg-warning/10 text-warning',
  baixa: 'border-info/25 bg-info/10 text-info',
};

const ICONE_TIPO: Record<PontoAtencao['tipo'], LucideIcon> = {
  gargalo: Timer,
  vaga: Briefcase,
  conversao: TrendingDown,
  desistencia: UserMinus,
};

export function AnalyticsAtencao({ atencao, index }: { atencao: PontoAtencao[]; index: number }) {
  return (
    <AnalyticsPainel
      icon={AlertTriangle}
      title="Pontos de atenção"
      subtitle="Gargalos e riscos identificados no funil"
      tom="warning"
      index={index}
      action={
        atencao.length > 0 ? (
          <ChipContagem>{atencao.length} {atencao.length === 1 ? 'alerta' : 'alertas'}</ChipContagem>
        ) : undefined
      }
    >
      {atencao.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-success/25 bg-success/5 px-4 py-7 text-center">
          <CircleCheck className="h-5 w-5 text-success" aria-hidden />
          <p className="text-[12px] font-medium text-foreground/85">Nenhum gargalo crítico</p>
          <p className="max-w-[230px] text-[10.5px] leading-snug text-muted-foreground">
            O funil está fluindo dentro dos limites de tempo e conversão.
          </p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Pontos de atenção do recrutamento">
          {atencao.map((alerta) => {
            const Icone = ICONE_TIPO[alerta.tipo];
            return (
              <li
                key={alerta.id}
                className="flex gap-2 rounded-xl border border-border/40 bg-background/40 p-2"
                title={`${alerta.titulo} — ${alerta.descricao}`}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                    ESTILO_SEVERIDADE[alerta.severidade]
                  )}
                >
                  <Icone className="h-3 w-3" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium leading-snug text-foreground">{alerta.titulo}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{alerta.descricao}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {atencao.length > 0 && (
        <p className="mt-auto pt-2.5 text-[9.5px] leading-snug text-muted-foreground/80">
          Regras: permanência &gt; 21 dias, vaga parada &gt; 15 dias e conversão &lt; 60%.
        </p>
      )}
    </AnalyticsPainel>
  );
}
