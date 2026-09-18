import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { DollarSign } from 'lucide-react';
import { useHoleritesColaborador } from '@/hooks';

// Lista resumida — não gera holerite (isso é feito por
// supabase/functions/gerar-holerite + folhaPagamentoService), só lê o que já
// existe. Mesmo estilo visual de PortalFinanceiroTab (portal do colaborador).
export function HoleritesTab({ colaboradorId }: { colaboradorId: string }) {
  const { data: holerites, isLoading } = useHoleritesColaborador(colaboradorId);

  if (isLoading) return <div className="flex items-center justify-center h-32"><Spinner /></div>;

  if (!holerites?.length) {
    return (
      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="py-8 text-center text-muted-foreground">
          <DollarSign className="mx-auto h-8 w-8 mb-2 opacity-40" />
          Nenhum holerite encontrado para este colaborador.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {holerites.map((h: any) => (
        <Card key={h.id} className="border border-border/30 rounded-xl">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-success to-success/70">
                <DollarSign className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm">{h.competencia}</p>
                <p className="text-xs text-muted-foreground">
                  Bruto: {Number(h.total_proventos || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="font-display font-medium text-success">
                {Number(h.total_liquido || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <Badge variant={h.assinado ? 'default' : 'secondary'} className="text-[10px]">
                {h.assinado ? 'Assinado' : 'Pendente de assinatura'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
