import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { User, UserPlus, UserMinus, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BeneficioHistoricoProps {
  beneficioId?: string;
  colaboradorId?: string;
}

export function BeneficioHistorico({ beneficioId, colaboradorId }: BeneficioHistoricoProps) {
  const { data: movimentacoes, isLoading } = useQuery({
    queryKey: ['beneficio-movimentacoes', beneficioId, colaboradorId],
    queryFn: async () => {
      let query = supabase
        .from('beneficio_movimentacoes')
        .select(`
          *,
          colaboradores (nome_completo),
          beneficios (nome)
        `)
        .order('created_at', { ascending: false });
      
      if (beneficioId) query = query.eq('beneficio_id', beneficioId);
      if (colaboradorId) query = query.eq('colaborador_id', colaboradorId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!beneficioId || !!colaboradorId});

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>;

  return (
    <div className="rounded-xl border border-border/30 overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-xs">Data</TableHead>
            <TableHead className="text-xs">Tipo</TableHead>
            <TableHead className="text-xs">
              {colaboradorId ? 'Benefício' : 'Colaborador'}
            </TableHead>
            <TableHead className="text-xs">Motivo</TableHead>
            <TableHead className="text-xs">Responsável</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movimentacoes && movimentacoes.length > 0 ? (
            movimentacoes.map((mov) => (
              <TableRow key={mov.id} className="hover:bg-accent/20 transition-colors">
                <TableCell className="text-[10px] font-mono">
                  {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {mov.tipo_movimentacao === 'adesao' && <UserPlus className="h-3 w-3 text-success" />}
                    {mov.tipo_movimentacao === 'exclusao' && <UserMinus className="h-3 w-3 text-destructive" />}
                    {mov.tipo_movimentacao === 'alteracao' && <RefreshCw className="h-3 w-3 text-info" />}
                    <Badge variant="outline" className={
                      mov.tipo_movimentacao === 'adesao' ? "bg-success/10 text-success border-success/20 text-[10px]" :
                      mov.tipo_movimentacao === 'exclusao' ? "bg-destructive/10 text-destructive border-destructive/20 text-[10px]" :
                      "bg-info/10 text-info border-info/20 text-[10px]"
                    }>
                      {mov.tipo_movimentacao}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-medium">
                  {colaboradorId ? mov.beneficios?.nome : mov.colaboradores?.nome_completo}
                </TableCell>
                <TableCell className="text-[10px] text-muted-foreground max-w-[150px] truncate" title={mov.motivo ?? undefined}>
                  {mov.motivo || '-'}
                </TableCell>
                <TableCell className="text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Sistema
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs italic">
                Nenhuma movimentação registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
