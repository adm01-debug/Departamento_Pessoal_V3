import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, PlusCircle, XCircle } from 'lucide-react';
import type { EmprestimoItem } from '@/types/descontos';

export type EmprestimoUpdate = {
  id: string;
  patch: { status?: 'quitado' | 'cancelado'; parcelas_pagas?: number };
};

export function EmprestimosTable({
  emprestimos,
  fmt,
  onUpdate,
  updating = false,
}: {
  emprestimos: EmprestimoItem[];
  fmt: (v: number | null) => string;
  onUpdate?: (v: EmprestimoUpdate) => void;
  updating?: boolean;
}) {
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
          {onUpdate && <TableHead className="text-right">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {emprestimos.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">{e.colaborador?.nome_completo}</TableCell>
            <TableCell>{e.instituicao_financeira || '-'}</TableCell>
            <TableCell>{fmt(e.valor_total)}</TableCell>
            <TableCell>{fmt(e.valor_parcela)}</TableCell>
            <TableCell className="w-[200px]">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                  <span>
                    {e.parcelas_pagas || 0} / {e.numero_parcelas}
                  </span>
                  <span>{Math.round(((e.parcelas_pagas || 0) / (e.numero_parcelas || 1)) * 100)}%</span>
                </div>
                <Progress value={((e.parcelas_pagas || 0) / (e.numero_parcelas || 1)) * 100} className="h-1" />
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={e.status === 'ativo' ? 'default' : 'secondary'}>{e.status}</Badge>
            </TableCell>
            {onUpdate && (
              <TableCell className="text-right">
                {e.status === 'ativo' && (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Registrar parcela paga"
                      title="Registrar parcela paga"
                      className="h-8 w-8"
                      disabled={updating || (e.parcelas_pagas || 0) >= e.numero_parcelas}
                      onClick={() => {
                        const pagas = Math.min((e.parcelas_pagas || 0) + 1, e.numero_parcelas);
                        onUpdate({
                          id: e.id,
                          patch:
                            pagas >= e.numero_parcelas
                              ? { parcelas_pagas: pagas, status: 'quitado' }
                              : { parcelas_pagas: pagas },
                        });
                      }}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Quitar"
                      title="Quitar"
                      className="h-8 w-8 text-success hover:bg-success/10"
                      disabled={updating}
                      onClick={() => onUpdate({ id: e.id, patch: { status: 'quitado' } })}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Cancelar"
                      title="Cancelar"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      disabled={updating}
                      onClick={() => onUpdate({ id: e.id, patch: { status: 'cancelado' } })}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
        {emprestimos.length === 0 && (
          <TableRow>
            <TableCell colSpan={onUpdate ? 7 : 6} className="text-center py-12 text-muted-foreground italic">
              Nenhum empréstimo registrado.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
