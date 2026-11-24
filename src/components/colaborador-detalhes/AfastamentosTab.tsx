import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAfastamentosRecentes } from '@/hooks';

// PARTE E/20: mostra só status/datas/tipo (categoria) — nunca CID, atestado,
// médico ou pericia, mesmo sem checagem de permissão hoje no restante do app.
export function AfastamentosTab({ colaboradorId }: { colaboradorId: string }) {
  const { data: afastamentos, isLoading } = useAfastamentosRecentes(colaboradorId, 365);

  if (isLoading) return <div className="flex items-center justify-center h-32"><Spinner /></div>;

  const lista = afastamentos || [];
  const atual = lista.find((a: any) => !a.data_fim_real);
  const historico = lista.filter((a: any) => a.data_fim_real);

  return (
    <div className="space-y-6">
      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-6">
          <p className="text-sm font-medium mb-2">Situação Atual</p>
          {atual ? (
            <div className="text-sm space-y-1">
              <p>Tipo: <Badge variant="outline">{atual.tipo}</Badge></p>
              <p>Início: {atual.data_inicio}</p>
              <p>Previsão de retorno: {atual.data_fim_prevista ?? 'não informada'}</p>
              <p>Status: <Badge>{atual.status}</Badge></p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum afastamento em andamento.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-6 space-y-3">
          <p className="text-sm font-medium">Histórico (últimos 12 meses)</p>
          {!historico.length ? (
            <p className="text-sm text-muted-foreground">Nenhum afastamento concluído nos últimos 12 meses.</p>
          ) : (
            <div className="space-y-2">
              {historico.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20">
                  <span>{a.tipo} — {a.data_inicio} até {a.data_fim_real}</span>
                  <Badge variant="secondary">{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
