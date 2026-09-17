import { PageTitle } from '@/components/PageTitle';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { Clock, TrendingUp, TrendingDown, Scale } from 'lucide-react';

export default function BancoHorasPage() {
  const { empresaAtual } = useEmpresas();

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['banco_horas', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banco_horas')
        .select('*, colaborador:colaboradores(nome_completo)')
        .eq('empresa_id', empresaAtual!.id)
        .order('data', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const creditos = registros.filter((r: any) => r.tipo === 'credito');
  const debitos = registros.filter((r: any) => r.tipo === 'debito');

  return (
    <>
    <PageTitle title="Banco de Horas" description="Controle de banco de horas" />
    <PageLayout title="Banco de Horas">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Clock className="h-8 w-8 text-primary" /><div><p className="text-2xl font-medium">{registros.length}</p><p className="text-xs text-muted-foreground">Registros</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-success" /><div><p className="text-2xl font-medium">{creditos.length}</p><p className="text-xs text-muted-foreground">Créditos</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingDown className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-medium">{debitos.length}</p><p className="text-xs text-muted-foreground">Débitos</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Scale className="h-8 w-8 text-info" /><div><p className="text-2xl font-medium">—</p><p className="text-xs text-muted-foreground">Saldo geral</p></div></CardContent></Card>
      </div>

      {isLoading ? <Spinner /> : (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Horas</TableHead><TableHead>Saldo Anterior</TableHead><TableHead>Saldo Atual</TableHead><TableHead>Motivo</TableHead></TableRow></TableHeader>
            <TableBody>
              {registros.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum registro no banco de horas</TableCell></TableRow> :
                registros.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{(r as any).colaborador?.nome_completo || '—'}</TableCell>
                    <TableCell>{r.data}</TableCell>
                    <TableCell>{r.tipo === 'credito' ? <Badge className="bg-success/20 text-success"><TrendingUp className="h-3 w-3 mr-1" />Crédito</Badge> : <Badge variant="destructive"><TrendingDown className="h-3 w-3 mr-1" />Débito</Badge>}</TableCell>
                    <TableCell className="font-mono">{r.horas}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{r.saldo_anterior || '—'}</TableCell>
                    <TableCell className="font-mono">{r.saldo_atual || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{r.motivo || '—'}</TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </Card>
      )}
    </PageLayout>
    </>
  );
}
