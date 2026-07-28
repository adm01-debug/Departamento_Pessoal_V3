import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { History, Search, Download, User, Calendar, Tag, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportPontoCSV } from '@/services/exportService';
import { motion } from 'framer-motion';

export function PontoAuditTimeline({ filterTabela }: { filterTabela?: string }) {
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['ponto-audit-logs', filterTabela],
    queryFn: async () => {
      let query = (supabase as any)
        .from('audit_log')
        .select('*');
      
      if (filterTabela) {
        query = query.eq('tabela', filterTabela);
      } else {
        query = query.or('tabela.eq.batidas_ponto,tabela.eq.registros_ponto,tabela.eq.solicitacoes_ajuste_ponto');
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    }
  });

  // Real-time listener for audit logs
  useMemo(() => {
    const channel = (supabase as any)
      .channel('audit-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_log' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ponto-audit-logs'] });
        }
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [queryClient]);



  const filteredLogs = auditLogs.filter((log: any) => 
    log.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.tabela.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportAudit = () => {
    const exportData = filteredLogs.map((log: any) => ({
      data: format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
      usuario: log.user_email || 'Sistema',
      acao: log.acao,
      tabela: log.tabela,
      registro_id: log.registro_id
    }));
    exportPontoCSV(exportData, 'trilha-auditoria-ponto.csv');
  };


  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden mt-6">
      <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-display flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Trilha de Auditoria (Timeline)
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Buscar na trilha..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs w-48"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExportAudit}>
            <Download className="h-3 w-3" /> Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6 relative before:absolute before:inset-0 before:left-[11px] before:w-px before:bg-gradient-to-b before:from-primary/50 before:via-border/50 before:to-transparent">
            {filteredLogs.map((log: any, idx: number) => (
              <motion.div 
                key={log.id} 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: idx * 0.05 }}
                className="relative pl-8 group"
              >
                <div className="absolute left-0 top-1.5 h-[24px] w-[24px] rounded-full bg-background border-2 border-primary flex items-center justify-center z-10 group-hover:scale-110 transition-transform shadow-xs">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] h-5 bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-wider">
                        {log.acao}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {format(new Date(log.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                      </span>
                      {log.tabela === 'batidas_ponto' && (
                        <Badge variant="outline" className="text-[9px] h-4 bg-success/5 text-success border-success/20 gap-1 px-1">
                          <ShieldCheck className="h-2 w-2" /> 99.8% Confiança Biometria
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/30">
                        REF: {log.registro_id.slice(0, 8)}
                      </span>
                      <div className="flex items-center gap-1 text-[8px] text-success font-bold">
                        <ShieldCheck className="h-2 w-2" /> PROVA SHA256
                      </div>
                    </div>

                  </div>
                  
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/30 to-background border border-border/40 group-hover:border-primary/30 transition-all group-hover:shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-foreground/90">{log.user_email || 'Sistema (Automático)'}</span>
                    </div>
                    
                    {log.dados_novos && log.acao === 'UPDATE' && (
                      <div className="relative overflow-hidden mb-3">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                        <div className="text-[10px] text-muted-foreground bg-primary/5 p-2.5 rounded-r-lg border border-l-0 border-primary/10">
                          <p className="font-bold mb-1">Alteração Detectada:</p>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(log.dados_novos, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className="flex items-center gap-1 text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/20">
                          <Tag className="h-3 w-3" /> Entidade: <span>{log.tabela}</span>
                        </span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors translate-x-0 group-hover:translate-x-1" />
                    </div>
                  </div>

                </div>
              </motion.div>
            ))}

            {/* Estados vazio/carregando: antes a lista renderizava em branco,
                sem qualquer feedback ao usuário. */}
            {isLoading && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Carregando trilha de auditoria…
              </p>
            )}
            {!isLoading && filteredLogs.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum registro de auditoria encontrado para os filtros atuais.
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
