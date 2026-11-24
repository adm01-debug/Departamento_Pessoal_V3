import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  pendente: 'bg-warning/15 text-warning border-0',
  gerada: 'bg-info/15 text-info border-0',
  paga: 'bg-success/15 text-success border-0',
  enviada: 'bg-success/15 text-success border-0',
  processada: 'bg-success/15 text-success border-0',
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

interface DctfTableProps {
  data: any[];
}

export function DctfTable({ data }: DctfTableProps) {
  return (
    <Card className="rounded-2xl border-border/30 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-display">Competência</TableHead>
            <TableHead className="font-display">Status</TableHead>
            <TableHead className="font-display">Data Envio</TableHead>
            <TableHead className="font-display">Valor Total</TableHead>
            <TableHead className="font-display">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 font-body">Nenhuma declaração DCTFWeb</TableCell></TableRow>
          ) : data.map((d: any) => (
            <TableRow key={d.id} className="hover:bg-accent/30 transition-colors">
              <TableCell className="font-body font-medium">{d.competencia}</TableCell>
              <TableCell><Badge className={cn("font-body text-xs", statusColors[d.status] || statusColors.pendente)}>{d.status}</Badge></TableCell>
              <TableCell className="font-body text-sm">{d.data_envio ? new Date(d.data_envio).toLocaleDateString('pt-BR') : '—'}</TableCell>
              <TableCell className="font-body font-semibold">{d.valor_total ? formatCurrency(Number(d.valor_total)) : '—'}</TableCell>
              <TableCell><Button size="sm" variant="ghost" className="rounded-lg text-xs h-7"><Download className="h-3 w-3" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

interface SefipTableProps {
  data: any[];
}

export function SefipTable({ data }: SefipTableProps) {
  return (
    <Card className="rounded-2xl border-border/30 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-display">Competência</TableHead>
            <TableHead className="font-display">Status</TableHead>
            <TableHead className="font-display">Arquivo</TableHead>
            <TableHead className="font-display">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8 font-body">Nenhum arquivo SEFIP</TableCell></TableRow>
          ) : data.map((s: any) => (
            <TableRow key={s.id} className="hover:bg-accent/30 transition-colors">
              <TableCell className="font-body font-medium">{s.competencia}</TableCell>
              <TableCell><Badge className={cn("font-body text-xs", statusColors[s.status] || statusColors.pendente)}>{s.status}</Badge></TableCell>
              <TableCell className="font-body text-sm">{s.arquivo_url ? '✅ Disponível' : '—'}</TableCell>
              <TableCell>
                {s.arquivo_url && <Button size="sm" variant="ghost" className="rounded-lg text-xs h-7"><Download className="h-3 w-3 mr-1" />Baixar</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
