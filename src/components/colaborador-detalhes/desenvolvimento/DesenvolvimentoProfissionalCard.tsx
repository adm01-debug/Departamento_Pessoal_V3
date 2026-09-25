import { motion } from 'framer-motion';
import { TrendingUp, Users, ClipboardList, Target, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { useFeedbacksColaborador, usePDIsColaborador, useMetasColaborador, useCompetenciasColaborador } from '@/hooks';
import { formatDate } from '@/utils/format';

const MotionCard = motion.create(Card);

/** Mesma animação/coreografia da barra de "Amplitude de Liderança"
 * (DashboardExecutivoPage) — cresce de 0 até o valor com stagger por índice,
 * em vez do preenchimento instantâneo do `Progress` (base) genérico. */
function AnimatedProgressBar({ value, index = 0 }: { value: number; index?: number }) {
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, delay: 0.15 + index * 0.1, ease: 'easeOut' }}
        className="h-full rounded-full bg-gradient-to-r from-primary to-success"
      />
    </div>
  );
}

const STATUS_LABEL: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'outline' }> = {
  concluido: { label: 'Concluído', variant: 'success' },
  concluida: { label: 'Concluído', variant: 'success' },
  em_andamento: { label: 'Em andamento', variant: 'info' },
  pendente: { label: 'Pendente', variant: 'warning' },
};

function statusInfo(status?: string | null) {
  if (!status) return { label: '—', variant: 'outline' as const };
  return STATUS_LABEL[status] ?? { label: status.replace(/_/g, ' '), variant: 'outline' as const };
}

function Modulo({
  icon: Icon, iconClassName, titulo, children,
}: {
  icon: typeof TrendingUp; iconClassName: string; titulo: string; children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/30 bg-background/70 p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${iconClassName}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium truncate">{titulo}</p>
      </div>
      {children}
    </div>
  );
}

/** Card "Desenvolvimento Profissional" — agrega Feedback 360, PDI, Metas/OKRs e
 * Competências (mesmos dados dos antigos blocos empilhados de
 * DesenvolvimentoResumoTab) em 4 módulos compactos lado a lado. */
export function DesenvolvimentoProfissionalCard({ colaboradorId }: { colaboradorId: string }) {
  const { data: feedbacks, isLoading: isLoadingFeedback } = useFeedbacksColaborador(colaboradorId);
  const { data: pdis, isLoading: isLoadingPDI } = usePDIsColaborador(colaboradorId);
  const { data: metas, isLoading: isLoadingMetas } = useMetasColaborador(colaboradorId);
  const { data: competencias, isLoading: isLoadingCompetencias } = useCompetenciasColaborador(colaboradorId);

  const isLoading = isLoadingFeedback || isLoadingPDI || isLoadingMetas || isLoadingCompetencias;
  const feedback = (feedbacks as any[] | undefined)?.[0];
  const pdi = (pdis as any[] | undefined)?.[0];
  const listaMetas = (metas as any[] | undefined) ?? [];
  const listaCompetencias = (competencias as any[] | undefined) ?? [];
  const metasAtivas = listaMetas.filter((m) => !['concluido', 'concluida', 'cancelado'].includes(m.status)).length;
  const progressoMedio = listaMetas.length
    ? Math.round(listaMetas.reduce((s, m) => s + Number(m.progresso ?? 0), 0) / listaMetas.length)
    : 0;

  return (
    <MotionCard custom={2} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated h-full">
      <CardContent className="p-4">
        <div className="flex items-start gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-display font-medium">Desenvolvimento Profissional</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Avaliações, plano de desenvolvimento, metas e competências</p>
          </div>
        </div>

        {isLoading ? <div className="flex justify-center py-4"><Spinner /></div> : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Modulo icon={Users} iconClassName="bg-primary/10 text-primary" titulo="Feedback 360">
              {feedback ? (
                <div className="space-y-1.5">
                  <span className="text-2xl font-semibold leading-none block">{feedback.nota_geral ?? '—'}</span>
                  {feedback.performance && <Badge variant="success" size="sm">{feedback.performance}</Badge>}
                  <p className="text-[11px] text-muted-foreground">Ciclo atual</p>
                </div>
              ) : <p className="text-xs text-muted-foreground">Nenhum feedback registrado.</p>}
            </Modulo>

            <Modulo icon={ClipboardList} iconClassName="bg-info/10 text-info" titulo="PDI">
              {pdi ? (
                <div className="space-y-1">
                  <Badge variant={statusInfo(pdi.status).variant} size="sm">{statusInfo(pdi.status).label}</Badge>
                  <p className="text-xs leading-snug">{pdi.titulo ?? pdi.acao_desenvolvimento ?? pdi.acao}</p>
                  <p className="text-[10px] text-muted-foreground">Última atualização: {formatDate(pdi.updated_at ?? pdi.created_at)}</p>
                </div>
              ) : <p className="text-xs text-muted-foreground">Nenhum PDI registrado.</p>}
            </Modulo>

            <Modulo icon={Target} iconClassName="bg-success/10 text-success" titulo="Metas / OKRs">
              {listaMetas.length ? (
                <div className="space-y-1.5">
                  <p className="text-lg font-semibold leading-none text-primary">{metasAtivas} ativas</p>
                  <p className="text-[11px] text-muted-foreground">de {listaMetas.length} no total</p>
                  <AnimatedProgressBar value={progressoMedio} />
                  <p className="text-[10px] text-muted-foreground">{progressoMedio}% de conclusão</p>
                </div>
              ) : <p className="text-xs text-muted-foreground">Nenhuma meta registrada.</p>}
            </Modulo>

            <Modulo icon={Star} iconClassName="bg-warning/10 text-warning" titulo="Competências">
              {listaCompetencias.length ? (
                <div className="space-y-2">
                  {listaCompetencias.map((comp, i) => (
                    <div key={comp.id}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="truncate">{comp.nome}</span>
                        <span className="text-muted-foreground shrink-0 ml-1">{comp.percentual}%</span>
                      </div>
                      <div className="mt-1">
                        <AnimatedProgressBar value={comp.percentual} index={i} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground">Nenhum dado de competências registrado.</p>}
            </Modulo>
          </div>
        )}
      </CardContent>
    </MotionCard>
  );
}
