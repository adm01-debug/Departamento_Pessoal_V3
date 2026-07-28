import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Calendar, Tag, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

export function FolhaAuditTimeline({ competencia }: { competencia: string }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['folha-audit-logs', competencia],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('folha_auditoria')
        .select('*, colaborador:colaboradores(nome_completo)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden mt-6">
      <CardHeader className="bg-muted/30 pb-3">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Trilha de Processamento (Competência {competencia})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="p-4 space-y-4">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs italic">
                Nenhum registro de processamento para este período.
              </div>
            ) : (
              logs.map((log: any, idx: number) => (
                <motion.div 
                  key={log.id} 
                  initial={{ opacity: 0, x: -5 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: idx * 0.05 }}
                  className="flex gap-3 relative before:absolute before:left-[11px] before:top-6 before:bottom-[-16px] before:w-[1px] before:bg-border/40 last:before:hidden"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 z-10">
                    {log.tipo_evento === 'CALCULO' ? <ShieldCheck className="h-3.5 w-3.5 text-primary" /> : <Tag className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[9px] h-4 bg-background uppercase font-bold">
                        {log.tipo_evento}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium leading-snug">
                      {log.colaborador?.nome_completo || 'Sistema'}
                    </p>
                    {log.mensagem && (
                       <p className="text-[10px] text-muted-foreground italic truncate max-w-[300px]">
                         {log.mensagem}
                       </p>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
