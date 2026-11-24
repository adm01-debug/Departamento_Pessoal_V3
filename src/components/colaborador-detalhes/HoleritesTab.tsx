import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { DollarSign } from 'lucide-react';
import { useHoleritesColaborador } from '@/hooks';

const fmtBRL = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Lista resumida — não gera holerite (isso é feito por
// supabase/functions/gerar-holerite + folhaPagamentoService), só lê o que já
// existe. Tabela compacta (Competência/Bruto/Descontos/Líquido/Status) em vez
// de um card por holerite — mesma densidade das demais seções de
// "Financeiro & Benefícios".
export function HoleritesTab({ colaboradorId, hideHeader = false }: { colaboradorId: string; hideHeader?: boolean }) {
  const { data: holerites, isLoading } = useHoleritesColaborador(colaboradorId);

  if (isLoading) return <div className="flex items-center justify-center h-32"><Spinner /></div>;

  const conteudo = (
    <>
      {!hideHeader && (
        <h3 className="text-sm font-display font-medium flex items-center gap-2 mb-2.5">
          <DollarSign className="h-4 w-4 text-primary" /> Holerites
        </h3>
      )}
      {!holerites?.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum holerite encontrado para este colaborador.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-6 px-2 text-[11px] font-medium">Competência</TableHead>
              <TableHead className="h-6 px-2 text-[11px] font-medium">Bruto</TableHead>
              <TableHead className="h-6 px-2 text-[11px] font-medium">Descontos</TableHead>
              <TableHead className="h-6 px-2 text-[11px] font-medium">Líquido</TableHead>
              <TableHead className="h-6 px-2 text-[11px] font-medium">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holerites.map((h: any) => {
              const bruto = Number(h.total_proventos || 0);
              const liquido = Number(h.total_liquido || 0);
              const descontos = Math.max(0, bruto - liquido);
              return (
                <TableRow key={h.id} className="hover:bg-background/70 transition-colors">
                  <TableCell className="px-2 py-1.5 text-[12.5px] font-medium">{h.competencia}</TableCell>
                  <TableCell className="px-2 py-1.5 text-[12.5px]">{fmtBRL(bruto)}</TableCell>
                  <TableCell className="px-2 py-1.5 text-[12.5px] text-destructive">{fmtBRL(descontos)}</TableCell>
                  <TableCell className="px-2 py-1.5 text-[12.5px] text-success font-medium">{fmtBRL(liquido)}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant={h.assinado ? 'default' : 'secondary'} size="sm">
                      {h.assinado ? 'Assinado' : 'Pendente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );

  if (hideHeader) return conteudo;

  return (
    <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
      <CardContent className="p-4">{conteudo}</CardContent>
    </Card>
  );
}
