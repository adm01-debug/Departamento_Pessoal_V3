import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';

export function AdiantamentosTable({ adiantamentos, fmt, onUpdateStatus, cn }: any) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Colaborador</TableHead>
          <TableHead>Data Solicitação</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Competência</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {adiantamentos.map((a: any) => (
          <TableRow key={a.id}>
            <TableCell className="font-medium">{a.colaborador?.nome_completo}</TableCell>
            <TableCell>{new Date(a.data_solicitacao).toLocaleDateString('pt-BR')}</TableCell>
            <TableCell>{fmt(a.valor_solicitado)}</TableCell>
            <TableCell>{a.competencia_desconto}</TableCell>
            <TableCell>
              <Badge className={cn(
                "font-bold uppercase text-[10px] tracking-widest",
                a.status === 'pendente' && "bg-warning/20 text-warning border-warning/30",
                a.status === 'aprovado' && "bg-success/20 text-success border-success/30",
                a.status === 'rejeitado' && "bg-destructive/20 text-destructive border-destructive/30",
                a.status === 'pago' && "bg-primary/20 text-primary border-primary/30"
              )}>
                {a.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {a.status === 'pendente' && (
                <div className="flex justify-end gap-2">
                  <Button size="icon" variant="ghost" aria-label="Aprovar" className="h-8 w-8 text-success hover:bg-success/10" onClick={() => onUpdateStatus({ id: a.id, status: 'aprovado' })}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Rejeitar" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onUpdateStatus({ id: a.id, status: 'rejeitado' })}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
        {adiantamentos.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
              Nenhuma solicitação de adiantamento.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
