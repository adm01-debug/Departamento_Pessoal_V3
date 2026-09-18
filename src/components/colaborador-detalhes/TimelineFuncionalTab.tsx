import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useTimelineFuncional } from '@/hooks/useTimelineFuncional';

const COR_POR_TIPO: Record<string, string> = {
  admissao: 'bg-success/10 text-success',
  desligamento: 'bg-destructive/10 text-destructive',
  medida_disciplinar: 'bg-destructive/10 text-destructive',
  afastamento: 'bg-warning/10 text-warning',
};

export function TimelineFuncionalTab({ colaboradorId }: { colaboradorId: string }) {
  const { eventos, isLoading } = useTimelineFuncional(colaboradorId);

  if (isLoading) return <div className="flex items-center justify-center h-32"><Spinner /></div>;

  if (!eventos.length) {
    return (
      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum evento funcional encontrado para este colaborador.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {eventos.map((e, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border/30 bg-muted/10">
          <Badge className={`rounded-full whitespace-nowrap ${COR_POR_TIPO[e.tipo] ?? 'bg-primary/10 text-primary'}`}>
            {e.data}
          </Badge>
          <div>
            <p className="text-sm font-medium">{e.titulo}</p>
            {e.descricao && <p className="text-xs text-muted-foreground">{e.descricao}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
