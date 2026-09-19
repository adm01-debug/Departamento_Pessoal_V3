import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { colaboradorService } from '@/services';
import { cargoService } from '@/services/cargoService';
import { localTrabalhoService } from '@/services/localTrabalhoService';
import { useCentrosCusto } from '@/hooks/useTabelasReferencia';
import { useTimes, useLotacoes } from '@/hooks/useColaboradorDetalhes';
import { HistoricoVinculosCard } from './HistoricoVinculosCard';

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold">{valor ?? '—'}</p>
    </div>
  );
}

export function TrabalhoHierarquiaTab({ colaboradorId }: { colaboradorId: string }) {
  // Mesma query key usada no Resumo (ColaboradorDetalhesPage) — reaproveita o cache,
  // sem refetch se o usuário já visitou o Resumo.
  const { data: colaborador, isLoading: isLoadingColaborador } = useQuery({
    queryKey: ['colaborador', colaboradorId],
    queryFn: () => colaboradorService.buscarPorId(colaboradorId),
    enabled: !!colaboradorId,
  });

  const empresaId = colaborador?.empresa_id;

  const { data: cargoDetalhe } = useQuery({
    queryKey: ['cargo-resumo', colaborador?.cargo_id],
    queryFn: () => cargoService.buscarPorId(colaborador!.cargo_id!, empresaId ?? undefined),
    enabled: !!colaborador?.cargo_id,
  });

  const { data: localTrabalhoDetalhe } = useQuery({
    queryKey: ['local-trabalho-resumo', colaborador?.local_trabalho_id],
    queryFn: () => localTrabalhoService.buscarPorId(colaborador!.local_trabalho_id!, empresaId ?? undefined),
    enabled: !!colaborador?.local_trabalho_id,
  });

  const { data: centrosCusto } = useCentrosCusto(empresaId);
  const centroCustoDetalhe = (centrosCusto as any[] | undefined)?.find(c => c.id === colaborador?.centro_custo_id);

  const { data: times } = useTimes(empresaId);
  const timeDetalhe = (times as any[] | undefined)?.find(t => t.id === colaborador?.time_id);

  const { data: lotacoes, isLoading: isLoadingLotacoes } = useLotacoes(colaboradorId, empresaId);

  if (isLoadingColaborador) return <div className="flex items-center justify-center h-32"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Cargo" valor={cargoDetalhe?.nome ?? colaborador?.cargo} />
          <Campo label="CBO" valor={cargoDetalhe?.cbo ?? colaborador?.cbo} />
          <Campo label="Departamento" valor={colaborador?.departamento} />
          <Campo label="Centro de Custo" valor={centroCustoDetalhe?.nome ?? colaborador?.centro_custo} />
          <Campo
            label="Local de Trabalho"
            valor={localTrabalhoDetalhe
              ? `${localTrabalhoDetalhe.nome}${localTrabalhoDetalhe.cidade ? ` — ${localTrabalhoDetalhe.cidade}/${localTrabalhoDetalhe.uf}` : ''}`
              : colaborador?.local_trabalho}
          />
          <Campo label="Time" valor={timeDetalhe?.nome} />
        </CardContent>
      </Card>

      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-6 space-y-3">
          <p className="text-sm font-medium">Lotações</p>
          {isLoadingLotacoes ? (
            <Spinner />
          ) : !lotacoes?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma lotação cadastrada para este colaborador.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(lotacoes as any[]).map(l => (
                <Badge key={l.id} variant={l.ativa === false ? 'secondary' : 'default'} className="rounded-full">
                  {l.nome}{l.ativa === false ? ' (inativa)' : ''}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <HistoricoVinculosCard colaboradorId={colaboradorId} />

      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-6">
          <p className="text-sm font-medium mb-1">Gestor Direto</p>
          <p className="text-sm text-muted-foreground">
            A estrutura atual não define de forma inequívoca quem é o gestor direto de cada colaborador
            (os candidatos existentes no schema não são preenchidos por nenhum fluxo do sistema hoje).
            Requer decisão de modelagem antes de exibir este dado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
