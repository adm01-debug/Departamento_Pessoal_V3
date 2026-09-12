import { useQuery } from '@tanstack/react-query';
import { auditoriaService } from '@/services/auditoriaService';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { History, User, Clock, ArrowRight, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface ColaboradorHistoryProps {
  colaboradorId: string;
}

export function ColaboradorHistory({ colaboradorId }: ColaboradorHistoryProps) {
  const { empresaAtual } = useEmpresas();
  const { data: logs, isLoading } = useQuery({
    queryKey: ['colaborador-history', empresaAtual?.id, colaboradorId],
    queryFn: () =>
      auditoriaService.listarTrilha({
        empresa_id: empresaAtual!.id,
        tabela: 'colaboradores',
        registro_id: colaboradorId,
        limite: 200,
      }),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );

  return (
    <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
      <CardHeader className="bg-muted/30 border-b border-border/20 py-4 px-6">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Histórico de Alterações (Audit Trail)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {!logs || logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground font-body italic">
              Nenhuma alteração registrada para este colaborador.
            </div>
          ) : (
            <div className="p-6 space-y-8 relative">
              {/* Linha vertical central */}
              <div className="absolute left-[27px] top-8 bottom-8 w-px bg-border/40" />

              {logs.map((log: any, index: number) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative pl-10"
                >
                  {/* Ponto na timeline */}
                  <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10">
                    <Clock className="h-3 w-3 text-primary" />
                  </div>

                  <div className="bg-muted/20 border border-border/30 rounded-xl p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            log.acao === 'INSERT'
                              ? 'bg-success/10 text-success border-success/20'
                              : log.acao === 'UPDATE'
                                ? 'bg-info/10 text-info border-info/20'
                                : 'bg-destructive/10 text-destructive border-destructive/20'
                          }
                        >
                          {log.acao === 'INSERT'
                            ? 'Admissão/Criação'
                            : log.acao === 'UPDATE'
                              ? 'Atualização'
                              : 'Exclusão'}
                        </Badge>
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> {log.user_email || 'Sistema'}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
                        {format(new Date(log.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {log.campos_alterados && log.campos_alterados.length > 0 && (
                      <div className="grid grid-cols-1 gap-2">
                        {log.campos_alterados.map((campo: string) => {
                          const de = log.dados_anteriores?.[campo];
                          const para = log.dados_novos?.[campo];

                          // Ignorar se não houver mudança real visualizável
                          if (de === para) return null;

                          return (
                            <div
                              key={campo}
                              className="flex flex-wrap items-center gap-2 text-xs bg-background/50 p-2 rounded-lg border border-border/10"
                            >
                              <span className="font-bold flex items-center gap-1 text-primary">
                                <Tag className="h-3 w-3" /> {campo.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-muted-foreground line-through decoration-destructive/30">
                                {String(de || 'vazio')}
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-semibold text-success">{String(para || 'vazio')}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {log.acao === 'INSERT' && (
                      <p className="text-xs text-muted-foreground italic">
                        Registro inicial do colaborador no sistema.
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
