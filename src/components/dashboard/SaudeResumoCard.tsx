import { Card, CardContent } from '@/components/ui/card';
import { WorkforceHealthScore } from './WorkforceHealthScore';
import { ResumoOperacionalCard } from './ResumoOperacionalCard';
import type { BriefingData } from './MorningBriefing';
import type { Pendencia } from '@/pages/DashboardPage';

interface SaudeResumoCardProps {
  turnover: number;
  absenteismo: number;
  cadastrosCompletos: number;
  totalColaboradores: number;
  feriasPendentes: number;
  passivoTotal?: number;
  briefing: BriefingData | undefined;
  pendencias: Pendencia[] | undefined;
  isLoading?: boolean;
}

/**
 * Funde "Saúde RH" (anel de pontuação) + "Resumo Operacional" (4 indicadores
 * do dia) numa única coluna — para reproduzir a composição de 3 colunas da
 * Linha 3 do preview de referência (Resumo Operacional | Próximas Atividades
 * | Atividade Recente), sem descartar a funcionalidade de nenhum dos 4
 * widgets que existiam antes (Saúde RH incluído).
 */
export function SaudeResumoCard({
  turnover, absenteismo, cadastrosCompletos, totalColaboradores, feriasPendentes, passivoTotal,
  briefing, pendencias, isLoading,
}: SaudeResumoCardProps) {
  return (
    <Card className="flex h-full min-h-[210px] flex-col overflow-hidden border border-border/60 rounded-xl">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <WorkforceHealthScore
          bare
          turnover={turnover}
          absenteismo={absenteismo}
          cadastrosCompletos={cadastrosCompletos}
          totalColaboradores={totalColaboradores}
          feriasPendentes={feriasPendentes}
          passivoTotal={passivoTotal}
        />
        <div className="border-t border-border/40 pt-4">
          <ResumoOperacionalCard bare briefing={briefing} pendencias={pendencias} isLoading={isLoading} />
        </div>
      </CardContent>
    </Card>
  );
}
