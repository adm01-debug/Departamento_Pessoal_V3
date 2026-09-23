import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Briefcase, Clock, Database, Pencil, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { colaboradorService, jornadaService } from '@/services';
import { usePonto } from '@/hooks/usePonto';
import {
  useRegistrosPontoSemana, useSaldoBancoHoras,
  useFaltasColaborador,
} from '@/hooks';
import { usePontoMelhorado } from '@/hooks/usePontoMelhorado';
import { useEmpresas } from '@/hooks/useEmpresas';
import { PontoTodayCard } from '@/components/ponto/PontoTodayCard';
import { PontoWeekSummary } from '@/components/ponto/PontoWeekSummary';
import { PontoOcorrenciasCard } from '@/components/ponto/PontoOcorrenciasCard';
import { PontoAjustesCard } from '@/components/ponto/PontoAjustesCard';
import { EditarJornadaDialog } from '@/components/colaborador-detalhes/EditarJornadaDialog';

/** Saldo do banco de horas em "±Xh MMm", ex.: 4.5 -> "+4h30". */
function formatSaldoHoras(saldo: number): string {
  const sign = saldo < 0 ? '-' : '+';
  const abs = Math.abs(saldo);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${sign}${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
}

/** Deriva a situação atual da jornada a partir das batidas do dia. */
function situacaoHoje(registroHoje: any): { label: string; className: string } {
  if (!registroHoje?.entrada_1) return { label: 'Não iniciado', className: 'text-muted-foreground' };
  if (registroHoje.saida_intervalo && !registroHoje.retorno_intervalo) {
    return { label: 'Em intervalo', className: 'text-warning' };
  }
  const ultimaEntrada = [registroHoje.entrada_3, registroHoje.entrada_2, registroHoje.entrada_1].find(Boolean);
  const ultimaSaida = [registroHoje.saida_3, registroHoje.saida_2, registroHoje.saida_1].find(Boolean);
  if (ultimaEntrada && (!ultimaSaida || ultimaEntrada > ultimaSaida)) {
    return { label: 'Em jornada', className: 'text-success' };
  }
  return { label: 'Jornada encerrada', className: 'text-muted-foreground' };
}

export function JornadaPontoTab({ colaboradorId }: { colaboradorId: string }) {
  const { empresaAtual } = useEmpresas();
  const [editarJornadaAberto, setEditarJornadaAberto] = useState(false);

  // Mesma query key do Resumo/Trabalho & Hierarquia — reaproveita o cache.
  const { data: colaborador, isLoading: isLoadingColaborador } = useQuery({
    queryKey: ['colaborador', colaboradorId],
    queryFn: () => colaboradorService.buscarPorId(colaboradorId),
    enabled: !!colaboradorId,
  });

  const { data: jornadaColaborador, isLoading: isLoadingJornada } = useQuery({
    queryKey: ['jornada-colaborador', colaboradorId, empresaAtual?.id],
    queryFn: () => jornadaService.obterJornadaColaborador(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });

  const { hoje, isLoading: isLoadingPontoHoje } = usePonto(colaboradorId);
  const { data: registrosSemana, isLoading: isLoadingSemana } = useRegistrosPontoSemana(colaboradorId);
  const { data: saldoBancoHoras, isLoading: isLoadingSaldo } = useSaldoBancoHoras(colaboradorId);
  const { data: faltas, isLoading: isLoadingFaltas } = useFaltasColaborador(colaboradorId);
  const { solicitacoes, isLoading: isLoadingAjustes } = usePontoMelhorado(empresaAtual?.id, colaboradorId);

  const ajustesPendentes = (solicitacoes || []).filter((s: any) => s.status === 'enviado');
  const registroHoje = Array.isArray(hoje) ? hoje[0] : hoje;
  const situacao = situacaoHoje(registroHoje);

  if (isLoadingColaborador) return <div className="flex items-center justify-center h-32"><Spinner /></div>;

  const kpis: {
    label: string;
    value: string;
    icon: typeof Briefcase;
    tone: 'info' | 'success';
    loading: boolean;
    valueClassName?: string;
    onEdit?: () => void;
  }[] = [
    {
      label: 'Jornada',
      value: colaborador?.jornada_semanal ? `${colaborador.jornada_semanal}h/semana` : '—',
      icon: Briefcase,
      tone: 'info' as const,
      loading: false,
    },
    {
      label: 'Escala Atual',
      value: jornadaColaborador?.horario_entrada && jornadaColaborador?.horario_saida
        ? `${jornadaColaborador.horario_entrada.slice(0, 5)} — ${jornadaColaborador.horario_saida.slice(0, 5)}`
        : 'Não definida',
      icon: Clock,
      tone: 'info' as const,
      loading: isLoadingJornada,
      onEdit: jornadaColaborador ? () => setEditarJornadaAberto(true) : undefined,
    },
    {
      label: 'Banco de Horas',
      value: formatSaldoHoras(Number(saldoBancoHoras ?? 0)),
      valueClassName: Number(saldoBancoHoras ?? 0) < 0 ? 'text-destructive' : 'text-success',
      icon: Database,
      tone: 'success' as const,
      loading: isLoadingSaldo,
    },
    {
      label: 'Situação Hoje',
      value: situacao.label,
      valueClassName: situacao.className,
      icon: User,
      tone: 'info' as const,
      loading: isLoadingPontoHoje,
    },
  ];

  const toneClasses: Record<'info' | 'success', string> = {
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="border border-border/30 rounded-2xl shadow-elevated h-full">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', toneClasses[kpi.tone])}>
                  <kpi.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                  {kpi.loading ? <Spinner /> : (
                    <p className={cn('font-semibold truncate', kpi.valueClassName)}>{kpi.value}</p>
                  )}
                </div>
                {kpi.onEdit && !kpi.loading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Editar escala"
                    onClick={kpi.onEdit}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <EditarJornadaDialog
        open={editarJornadaAberto}
        onOpenChange={setEditarJornadaAberto}
        jornada={jornadaColaborador}
        empresaId={empresaAtual?.id || ''}
      />

      {isLoadingPontoHoje ? <Spinner /> : (
        <PontoTodayCard
          registroHoje={registroHoje}
          colaboradorId={colaboradorId}
          colaboradorNome={colaborador?.nome_completo}
          empresaId={empresaAtual?.id}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        {isLoadingSemana ? <Spinner /> : <PontoWeekSummary registrosSemana={registrosSemana || []} />}
        <div className="space-y-4">
          {(isLoadingFaltas || isLoadingSemana) ? <Spinner /> : (
            <PontoOcorrenciasCard faltas={faltas || []} registrosSemana={registrosSemana || []} />
          )}
          <PontoAjustesCard totalPendentes={ajustesPendentes.length} isLoading={isLoadingAjustes} />
        </div>
      </div>
    </div>
  );
}
