import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type FgtsDigitalLinha = {
  id: string;
  competencia: string;
  tipo: string;
  valor_total: number | string;
  vencimento: string;
  status: string | null;
  gfd_protocolo: string | null;
  gfd_data_geracao: string | null;
};

const statusColors: Record<string, string> = {
  pendente: 'bg-warning/15 text-warning border-0',
  gerada: 'bg-info/15 text-info border-0',
  transmitida: 'bg-info/15 text-info border-0',
  paga: 'bg-success/15 text-success border-0',
  vencida: 'bg-destructive/15 text-destructive border-0',
  cancelada: 'bg-muted text-muted-foreground border-0',
};

/** Iniciais/bitmap de PIX: só as 8 primeiras para não estourar a célula. */
function resumoProtocolo(protocolo: string | null): string {
  return protocolo ? protocolo.slice(0, 12) : '—';
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

interface FgtsDigitalTableProps {
  guias: FgtsDigitalLinha[];
  emptyMessage: string;
  onMarcarPaga: (id: string) => void;
}

/**
 * Tabela das guias FGTS Digital (tabela `guias_fgts_digital`, alimentada pela
 * edge `fgts-digital`). Diferente de `GuiasTable`: aqui a coluna de vencimento é
 * `vencimento` (não `data_vencimento`) e existe o protocolo GFD — por isso a
 * tabela dedicada. `status` inclui `transmitida`, que não existe em `guias_fgts`.
 */
export function FgtsDigitalTable({ guias, emptyMessage, onMarcarPaga }: FgtsDigitalTableProps) {
  const hoje = new Date();

  return (
    <Card className="rounded-2xl border-border/30 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-display">Competência</TableHead>
            <TableHead className="font-display">Tipo</TableHead>
            <TableHead className="font-display">Valor</TableHead>
            <TableHead className="font-display">Vencimento</TableHead>
            <TableHead className="font-display">Protocolo GFD</TableHead>
            <TableHead className="font-display">Status</TableHead>
            <TableHead className="font-display">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guias.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8 font-body">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            guias.map((g) => {
              const vencida = g.status !== 'paga' && g.vencimento && new Date(g.vencimento) < hoje;
              return (
                <TableRow key={g.id} className="hover:bg-accent/30 transition-colors">
                  <TableCell className="font-body font-medium">{g.competencia}</TableCell>
                  <TableCell className="font-body text-sm capitalize">{g.tipo}</TableCell>
                  <TableCell className="font-body font-semibold">
                    {g.valor_total ? formatCurrency(Number(g.valor_total)) : '—'}
                  </TableCell>
                  <TableCell className="font-body text-sm">
                    <span className={cn(vencida && 'text-destructive font-semibold')}>
                      {new Date(g.vencimento).toLocaleDateString('pt-BR')}
                    </span>
                  </TableCell>
                  <TableCell className="font-body text-xs font-mono">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-primary"
                      title={g.gfd_protocolo ?? 'Sem protocolo'}
                      onClick={() => {
                        if (!g.gfd_protocolo) return;
                        void navigator.clipboard?.writeText(g.gfd_protocolo);
                        toast.success('Protocolo copiado');
                      }}
                    >
                      {resumoProtocolo(g.gfd_protocolo)}
                      {g.gfd_protocolo && <Copy className="h-3 w-3" />}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'font-body text-xs',
                        (vencida ? statusColors.vencida : g.status && statusColors[g.status]) ||
                          statusColors.pendente
                      )}
                    >
                      {vencida
                        ? 'Vencida'
                        : g.status
                          ? g.status.charAt(0).toUpperCase() + g.status.slice(1)
                          : '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {g.status !== 'paga' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg text-xs h-7"
                          onClick={() => onMarcarPaga(g.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Paga
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
