import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { usePeriodosAquisitivos } from '@/hooks/useColaboradorDetalhes';

export function AquisitivosTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = usePeriodosAquisitivos(colaboradorId);

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Períodos Aquisitivos de Férias</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <Spinner /> : !data?.length ? <p className="text-sm text-muted-foreground">Nenhum período aquisitivo.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Período Aquisitivo</TableHead><TableHead>Período Concessivo</TableHead><TableHead>Saldo</TableHead><TableHead>Faltas</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.inicio_aquisitivo} a {p.fim_aquisitivo}</TableCell>
                  <TableCell>{p.inicio_concessivo} a {p.fim_concessivo}</TableCell>
                  <TableCell className="font-semibold">{p.saldo_atual} dias</TableCell>
                  <TableCell>{p.faltas_periodo}</TableCell>
                  <TableCell><Badge variant={p.status === 'vencido' ? 'destructive' : 'default'}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
