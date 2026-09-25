import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, UserPlus, ClipboardCheck, Edit2, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { useOnboardingColaborador, usePeriodoExperiencia } from '@/hooks';
import { formatDate } from '@/utils/format';
import { ExperienciaTab } from '../ExperienciaTab';

const MotionCard = motion.create(Card);

function MarcoLinha({
  icon: Icon, titulo, subtitulo, status, variant, data, onEditar,
}: {
  icon: typeof Clock; titulo: string; subtitulo: string;
  status: string; variant: 'success' | 'info' | 'warning' | 'secondary'; data?: string;
  onEditar?: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/30 bg-background/70 p-3">
      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium leading-tight">{titulo}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{subtitulo}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge variant={variant} size="sm">{status}</Badge>
        {data && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" /> {data}
          </span>
        )}
        {onEditar && (
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" aria-label="Editar período de experiência" onClick={onEditar}>
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

const PERIODO_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  efetivado: { label: 'Concluído', variant: 'success' },
  em_andamento: { label: 'Em andamento', variant: 'warning' },
};

/** Card "Jornada Interna" — marcos de Onboarding e Período de Experiência,
 * mesmos dados de useOnboardingColaborador/usePeriodoExperiencia (antes na
 * seção "Onboarding" empilhada e na aba dedicada "Período de Experiência").
 * A edição do período de experiência continua sendo a mesma de ExperienciaTab,
 * reaproveitada num dialog. */
export function JornadaInternaCard({ colaboradorId }: { colaboradorId: string }) {
  const onboarding = useOnboardingColaborador(colaboradorId);
  const { data: periodo, isLoading: isLoadingPeriodo } = usePeriodoExperiencia(colaboradorId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isLoading = onboarding.isLoading || isLoadingPeriodo;

  const onboardingConcluido = onboarding.progresso === 100;
  const ultimaTarefaConcluida = onboarding.concluidas
    .map((t: any) => t.data_conclusao)
    .filter(Boolean)
    .sort()
    .at(-1);

  const periodoStatus = periodo ? (PERIODO_STATUS[(periodo as any).status] ?? { label: (periodo as any).status ?? '—', variant: 'secondary' as const }) : { label: 'Sem registro', variant: 'secondary' as const };
  const periodoData = (periodo as any)?.segunda_etapa_fim || (periodo as any)?.primeira_etapa_fim || (periodo as any)?.data_inicio;

  const datasConhecidas = [ultimaTarefaConcluida, periodoData].filter(Boolean).sort();
  const ultimaAtualizacao = datasConhecidas.at(-1);

  return (
    <MotionCard custom={3} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-start gap-2 mb-3">
          <Clock className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-display font-medium">Jornada Interna</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Marcos da jornada na empresa</p>
          </div>
        </div>

        {isLoading ? <div className="flex justify-center py-4"><Spinner /></div> : (
          <div className="space-y-2 flex-1 overflow-y-auto pr-1 -mr-1">
            <MarcoLinha
              icon={UserPlus}
              titulo="Onboarding"
              subtitulo="Processo de integração inicial"
              status={onboarding.onboarding ? (onboardingConcluido ? 'Concluído' : `Em andamento (${onboarding.progresso ?? 0}%)`) : 'Sem registro'}
              variant={onboarding.onboarding ? (onboardingConcluido ? 'success' : 'warning') : 'secondary'}
              data={ultimaTarefaConcluida ? formatDate(ultimaTarefaConcluida) : undefined}
            />
            <MarcoLinha
              icon={ClipboardCheck}
              titulo="Período de experiência"
              subtitulo="Avaliação inicial de desempenho"
              status={periodoStatus.label}
              variant={periodoStatus.variant}
              data={periodoData ? formatDate(periodoData) : undefined}
              onEditar={() => setDialogOpen(true)}
            />
          </div>
        )}

        {ultimaAtualizacao && (
          <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/20">
            Última atualização desta seção: {formatDate(ultimaAtualizacao)}
          </p>
        )}
      </CardContent>

      <AnimatedCascadeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Período de Experiência"
        titleIcon={ClipboardCheck}
        emptyMessage="Nenhum período de experiência cadastrado."
        items={[<ExperienciaTab key="experiencia" colaboradorId={colaboradorId} hideHeader />]}
        className="max-w-[560px]"
      />
    </MotionCard>
  );
}
