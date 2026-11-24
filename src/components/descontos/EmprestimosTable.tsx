import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function EmprestimosTable({ emprestimos, fmt }: any) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Colaborador</TableHead>
          <TableHead>Instituição</TableHead>
          <TableHead>Valor Total</TableHead>
          <TableHead>Parcela</TableHead>
          <TableHead>Progresso</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {emprestimos.map((e: any) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">{e.colaborador?.nome_completo}</TableCell>
            <TableCell>{e.instituicao_financeira || '-'}</TableCell>
            <TableCell>{fmt(e.valor_total)}</TableCell>
            <TableCell>{fmt(e.valor_parcela)}</TableCell>
            <TableCell className="w-[200px]">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase font-medium text-muted-foreground">
                  <span>{e.parcelas_pagas || 0} / {e.numero_parcelas}</span>
                  <span>{Math.round(((e.parcelas_pagas || 0) / e.numero_parcelas) * 100)}%</span>
                </div>
                <Progress value={((e.parcelas_pagas || 0) / e.numero_parcelas) * 100} className="h-1" />
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={e.status === 'ativo' ? 'default' : 'secondary'}>
                {e.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
        {emprestimos.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
              Nenhum empréstimo registrado.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
