import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  pendente: 'bg-warning/15 text-warning border-0',
  gerada: 'bg-info/15 text-info border-0',
  paga: 'bg-success/15 text-success border-0',
  vencida: 'bg-destructive/15 text-destructive border-0',
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

interface GuiasTableProps {
  guias: any[];
  tabela: string;
  emptyMessage: string;
  onMarcarPaga: (id: string, tabela: string) => void;
}

export function GuiasTable({ guias, tabela, emptyMessage, onMarcarPaga }: GuiasTableProps) {
  const hoje = new Date();

  return (
    <Card className="rounded-2xl border-border/30 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-display">Competência</TableHead>
            <TableHead className="font-display">Valor</TableHead>
            <TableHead className="font-display">Vencimento</TableHead>
            <TableHead className="font-display">Status</TableHead>
            <TableHead className="font-display">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guias.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 font-body">{emptyMessage}</TableCell></TableRow>
          ) : guias.map((g: any) => {
            const vencida = g.status !== 'paga' && g.data_vencimento && new Date(g.data_vencimento) < hoje;
            return (
              <TableRow key={g.id} className="hover:bg-accent/30 transition-colors">
                <TableCell className="font-body font-medium">{g.competencia}</TableCell>
                <TableCell className="font-body font-semibold">{g.valor ? formatCurrency(Number(g.valor)) : '—'}</TableCell>
                <TableCell className="font-body text-sm">
                  {g.data_vencimento ? (
                    <span className={cn(vencida && 'text-destructive font-semibold')}>
                      {new Date(g.data_vencimento).toLocaleDateString('pt-BR')}
                    </span>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <Badge className={cn("font-body text-xs", statusColors[vencida ? 'vencida' : g.status] || statusColors.pendente)}>
                    {vencida ? 'Vencida' : g.status?.charAt(0).toUpperCase() + g.status?.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {g.status !== 'paga' && (
                      <Button size="sm" variant="outline" className="rounded-lg text-xs h-7" onClick={() => onMarcarPaga(g.id, tabela)}>
                        <CheckCircle className="h-3 w-3 mr-1" />Paga
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="rounded-lg text-xs h-7"><Download className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
