import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts';

export function SSTIncidentesTab() {
  const { empresaAtual } = useEmpresa();
  
  const { data: incidentes = [], isLoading } = useQuery({
    queryKey: ['sst_incidentes', empresaAtual?.id],
    enabled: !!empresaAtual?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sst_incidentes')
        .select('*')
        .eq('empresa_id', empresaAtual!.id)
        .order('data_hora', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'em_investigacao': return <Badge className="bg-warning/15 text-warning border-0">Investigando</Badge>;
      case 'concluido': return <Badge className="bg-success/15 text-success border-0">Concluído</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'quase_acidente': return <Badge variant="outline" className="border-info/30 text-info">Quase Acidente</Badge>;
      case 'acidente_leve': return <Badge variant="outline" className="border-warning/30 text-warning">Acidente Leve</Badge>;
      case 'acidente_grave': return <Badge variant="outline" className="border-destructive/30 text-destructive font-bold">Acidente Grave</Badge>;
      default: return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/30 bg-gradient-to-br from-card to-accent/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive"><ShieldAlert className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold font-display">0</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Acidentes com Afastamento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning"><AlertCircle className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold font-display">2</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Incidentes este mês</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success"><CheckCircle2 className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold font-display">425</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Dias sem acidentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/30 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-display">Histórico de Ocorrências</CardTitle>
          <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => toast.info('Funcionalidade de exportação em breve')}>Exportar CAT</Button>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-display">Data</TableHead>
              <TableHead className="font-display">Tipo</TableHead>
              <TableHead className="font-display">Local</TableHead>
              <TableHead className="font-display">Descrição</TableHead>
              <TableHead className="font-display">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidentes.map((inc: any, i: number) => (
              <motion.tr key={inc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-accent/30 transition-colors">
                <TableCell className="font-body text-xs">{new Date(inc.data_hora || inc.data).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>{getTipoBadge(inc.tipo)}</TableCell>
                <TableCell className="font-body text-xs">{inc.local}</TableCell>
                <TableCell className="font-body text-xs max-w-[200px] truncate">{inc.descricao}</TableCell>
                <TableCell>{getStatusBadge(inc.status)}</TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
