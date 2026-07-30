import { motion } from 'framer-motion';
import { ESocialEvento } from '@/services/esocialService';
import { Card } from '@/components/ui/card';
import { FileCheck, Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ESocialTimelineProps {
  eventos: ESocialEvento[];
}

export function ESocialTimeline({ eventos }: ESocialTimelineProps) {
  // Combine creation and sending events into a single timeline
  const timelineItems = eventos.flatMap(e => {
    const items = [];
    
    // Creation event
    items.push({
      id: `${e.id}-created`,
      date: new Date(e.created_at),
      type: 'creation',
      label: `Evento ${e.tipo_evento} gerado`,
      description: 'Aguardando validação ou transmissão',
      status: 'pendente',
      evento: e
    });

    // Sending event (if sent or error)
    if (e.data_envio || e.status === 'erro' || e.status === 'enviado') {
      items.push({
        id: `${e.id}-transmission`,
        date: new Date(e.data_envio || e.updated_at),
        type: 'transmission',
        label: e.status === 'enviado' ? `Sucesso na transmissão ${e.tipo_evento}` : `Falha no envio ${e.tipo_evento}`,
        description: e.status === 'enviado' ? `Protocolo: ${e.protocolo}` : (e.erros as any)?.mensagem || 'Erro na comunicação com o webservice',
        status: e.status,
        evento: e
      });
    }

    return items;
  }).sort((a, b) => b.date.getTime() - a.date.getTime());

  if (timelineItems.length === 0) {
    return (
      <Card className="border border-border/30 rounded-2xl overflow-hidden p-12 text-center text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p className="font-bold">Sem histórico recente</p>
        <p className="text-sm">Gere ou envie eventos para ver a timeline.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/30">
        {timelineItems.slice(0, 20).map((item, i) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative"
          >
            <div className={cn(
              "absolute -left-[31px] p-1.5 rounded-full border shadow-xs z-10",
              item.status === 'enviado' ? "bg-success/10 border-success/30 text-success" : 
              item.status === 'erro' ? "bg-destructive/10 border-destructive/30 text-destructive" :
              "bg-muted border-border/50 text-muted-foreground"
            )}>
              {item.status === 'enviado' ? <CheckCircle className="h-3 w-3" /> : 
               item.status === 'erro' ? <AlertCircle className="h-3 w-3" /> :
               item.type === 'creation' ? <FileCheck className="h-3 w-3" /> :
               <Send className="h-3 w-3" />}
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold font-display">{item.label}</p>
                <span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full font-body">
                  {format(item.date, "dd 'de' MMM, HH:mm", { locale: ptBR })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-body line-clamp-1">
                {item.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
