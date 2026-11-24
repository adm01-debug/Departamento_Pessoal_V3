import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollText } from 'lucide-react';
import { motion } from 'framer-motion';

export function LogsIntegracoesTab() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['logs-integracoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logs_integracoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return data || [];
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-primary-glow to-primary" />
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <ScrollText className="h-5 w-5" /> Logs de Integrações
          </CardTitle>
          <CardDescription className="font-body">Últimos 100 registros de sincronização</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Integração</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.integracao_nome || l.integracao_id || '-'}</TableCell>
                    <TableCell className="text-sm">{l.acao || l.action || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={l.status === 'sucesso' || l.status === 'success' ? 'default' : 'destructive'}
                        className="rounded-full"
                      >
                        {l.status || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{l.registros_processados || l.records || 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum log de integração encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
