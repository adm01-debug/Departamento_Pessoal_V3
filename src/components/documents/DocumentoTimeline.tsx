import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, User, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DocumentoTimelineProps {
  documentoId: string;
}

export function DocumentoTimeline({ documentoId }: DocumentoTimelineProps) {
  const { data: historico, isLoading } = useQuery({
    queryKey: ['documento-historico', documentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentos_historico')
        .select('*')
        .eq('documento_id', documentoId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!documentoId});

  if (isLoading) return <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Carregando histórico...</div>;

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Histórico de Versões
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
            {historico && historico.length > 0 ? (
              historico.map((item, idx) => (
                <div key={item.id} className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-mono">v{item.versao}</Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(item.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-foreground">{item.alteracoes || 'Nova versão enviada'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Sistema
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {((item.tamanho || 0) / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-xs italic">
                Nenhum histórico disponível para este documento.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
