import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { colaboradorService } from '@/services';
import { usePonto } from '@/hooks/usePonto';
import {
  useRegistrosPontoSemana, useSaldoBancoHoras, useEscalaAtual,
  useFaltasColaborador,
} from '@/hooks';
import { usePontoMelhorado } from '@/hooks/usePontoMelhorado';
import { useEmpresas } from '@/hooks/useEmpresas';
import { PontoTodayCard } from '@/components/ponto/PontoTodayCard';
import { PontoWeekSummary } from '@/components/ponto/PontoWeekSummary';

export function JornadaPontoTab({ colaboradorId }: { colaboradorId: string }) {
  const { empresaAtual } = useEmpresas();

  // Mesma query key do Resumo/Trabalho & Hierarquia — reaproveita o cache.
  const { data: colaborador, isLoading: isLoadingColaborador } = useQuery({
    queryKey: ['colaborador', colaboradorId],
    queryFn: () => colaboradorService.buscarPorId(colaboradorId),
    enabled: !!colaboradorId,
  });

  const { hoje, isLoading: isLoadingPontoHoje } = usePonto(colaboradorId);
  const { data: registrosSemana, isLoading: isLoadingSemana } = useRegistrosPontoSemana(colaboradorId);
  const { data: saldoBancoHoras, isLoading: isLoadingSaldo } = useSaldoBancoHoras(colaboradorId);
  const { data: escalaAtual, isLoading: isLoadingEscala } = useEscalaAtual(colaboradorId);
  const { data: faltas, isLoading: isLoadingFaltas } = useFaltasColaborador(colaboradorId);
  const { solicitacoes, isLoading: isLoadingAjustes } = usePontoMelhorado(empresaAtual?.id, colaboradorId);

  const ajustesPendentes = (solicitacoes || []).filter((s: any) => s.status === 'enviado');
  const registroHoje = Array.isArray(hoje) ? hoje[0] : hoje;

  if (isLoadingColaborador) return <div className="flex items-center justify-center h-32"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Jornada Semanal</p>
            <p className="font-semibold">{colaborador?.jornada_semanal ? `${colaborador.jornada_semanal}h/semana` : '—'}</p>
          </div>
          <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Horário</p>
            <p className="font-semibold">
              {colaborador?.horario_entrada && colaborador?.horario_saida
                ? `${colaborador.horario_entrada} — ${colaborador.horario_saida}`
                : '—'}
            </p>
          </div>
          <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Turno / Escala Atual</p>
            {isLoadingEscala ? <Spinner /> : (
              <p className="font-semibold">{escalaAtual?.turno?.nome ?? 'Nenhuma escala registrada'}</p>
            )}
          </div>
          <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Banco de Horas</p>
            {isLoadingSaldo ? <Spinner /> : (
              <p className={`font-semibold ${Number(saldoBancoHoras) < 0 ? 'text-destructive' : 'text-success'}`}>
                {Number(saldoBancoHoras ?? 0).toFixed(2)}h
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoadingPontoHoje ? <Spinner /> : <PontoTodayCard registroHoje={registroHoje} />}
      {isLoadingSemana ? <Spinner /> : <PontoWeekSummary registrosSemana={registrosSemana || []} />}

      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Faltas Recentes</p>
            <Button asChild variant="outline" size="sm"><Link to="/ponto">Ver módulo de Ponto</Link></Button>
          </div>
          {isLoadingFaltas ? <Spinner /> : !faltas?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma falta registrada.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(faltas as any[]).slice(0, 10).map(f => (
                <Badge key={f.id} variant="secondary" className="rounded-full">{f.data}{f.justificada ? ' (justificada)' : ''}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Ajustes de Ponto Pendentes</p>
            <p className="text-sm text-muted-foreground">
              {isLoadingAjustes ? '—' : `${ajustesPendentes.length} solicitação(ões) aguardando aprovação`}
            </p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/ponto">Revisar</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
