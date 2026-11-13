import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FileX } from 'lucide-react';

// Os totalizadores S-5001/S-5002 devolvidos pelo eSocial ainda não são gravados no banco,
// então não há fonte real para comparar com a folha. Em vez de valores fictícios,
// a aba mostra o estado indisponível até esse retorno ser persistido.
export function ESocialConciliacao() {
  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
      <CardHeader className="bg-muted/20 border-b">
        <CardTitle className="text-lg font-display">Conciliação de Valores</CardTitle>
        <CardDescription>Comparativo entre cálculos do sistema e retornos do Governo</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <EmptyState
          icon={FileX}
          title="Conciliação indisponível"
          description="Requer o processamento dos retornos S-5001/S-5002 do eSocial, que ainda não são importados pelo sistema."
        />
      </CardContent>
    </Card>
  );
}
