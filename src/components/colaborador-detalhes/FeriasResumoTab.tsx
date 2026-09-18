import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useFeriasResumoColaborador } from '@/hooks';
import { useEmpresas } from '@/hooks/useEmpresas';
import { todayLocalISO } from '@/utils/dateLocal';

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', aprovada: 'Aprovada', em_gozo: 'Em gozo',
  concluida: 'Concluída', cancelada: 'Cancelada', rejeitada: 'Rejeitada',
};

export function FeriasResumoTab({ colaboradorId }: { colaboradorId: string }) {
  const { empresaAtual } = useEmpresas();
  const { data: ferias, isLoading } = useFeriasResumoColaborador(colaboradorId, empresaAtual?.id);

  if (isLoading) return <div className="flex items-center justify-center h-32"><Spinner /></div>;

  const lista = ferias || [];
  const hoje = todayLocalISO();
  const proxima = lista
    .filter((f: any) => ['pendente', 'aprovada'].includes(f.status) && f.data_inicio >= hoje)
    .sort((a: any, b: any) => a.data_inicio.localeCompare(b.data_inicio))[0];
  const historico = lista.filter((f: any) => f.status === 'concluida');

  return (
    <div className="space-y-6">
      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-6">
          <p className="text-sm font-medium mb-2">Próxima Férias Programada</p>
          {proxima ? (
            <p className="text-sm">
              {proxima.data_inicio} até {proxima.data_fim} ({proxima.dias_gozo} dias) —{' '}
              <Badge variant="outline">{STATUS_LABEL[proxima.status as string] ?? proxima.status}</Badge>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma férias programada.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-6 space-y-3">
          <p className="text-sm font-medium">Histórico de Férias</p>
          {!historico.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma férias concluída até o momento.</p>
          ) : (
            <div className="space-y-2">
              {historico.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20">
                  <span>{f.data_inicio} até {f.data_fim}</span>
                  <span className="text-muted-foreground">{f.dias_gozo} dias</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
