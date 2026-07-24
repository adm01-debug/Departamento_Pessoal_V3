import { memo, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, UserMinus, Calendar, FileText, Clock, AlertTriangle, 
  type LucideIcon, Filter, ArrowUpDown, ShieldCheck, MapPin, Globe
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRealTimeSubscription } from '@/hooks/useRealTimeSubscription';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'admissao' | 'demissao' | 'ferias' | 'folha' | 'ponto' | 'alerta';
  raw_time?: string;
}

const eventConfig: Record<string, { icon: LucideIcon; gradient: string }> = {
  admissao: { icon: UserPlus, gradient: 'from-primary to-primary-glow' },
  demissao: { icon: UserMinus, gradient: 'from-destructive to-streak' },
  ferias: { icon: Calendar, gradient: 'from-primary-glow to-primary' },
  folha: { icon: FileText, gradient: 'from-primary to-primary-glow' },
  ponto: { icon: Clock, gradient: 'from-primary to-primary-glow' },
  alerta: { icon: AlertTriangle, gradient: 'from-warning to-destructive' },
  compliance: { icon: ShieldCheck, gradient: 'from-destructive to-destructive/70' },
  geofencing: { icon: MapPin, gradient: 'from-warning to-warning/70' },
  timezone: { icon: Globe, gradient: 'from-info to-info/70' }
};

interface EventTimelineProps {
  events?: TimelineEvent[];
  className?: string;
  empresaId?: string;
}

export const EventTimeline = memo(function EventTimeline({ events: initialEvents, className, empresaId }: EventTimelineProps) {
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: dbEvents, isLoading } = useQuery({
    queryKey: ['audit-timeline', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('audit_log') as any)
        .select('*')
        .eq('empresa_id', empresaId!)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch audit logs and compliance alerts
      const [auditResponse, complianceResponse] = await Promise.all([
        (supabase as any).from('audit_log').select('*').eq('empresa_id', empresaId!).order('timestamp', { ascending: false }).limit(10),
        (supabase as any).from('conformidade_ponto_logs').select('*').eq('empresa_id', empresaId!).order('timestamp', { ascending: false }).limit(10)
      ]);

      if (auditResponse.error) throw auditResponse.error;
      
      const auditEvents = auditResponse.data.map((log: any) => ({
        id: log.id,
        title: `${log.tabela.charAt(0).toUpperCase() + log.tabela.slice(1)}: ${log.acao}`,
        description: `Alteração no registro ${log.registro_id?.substring(0, 8)}...`,
        time: format(new Date(log.timestamp), "HH:mm, dd MMM", { locale: ptBR }),
        raw_time: log.timestamp,
        type: log.tabela === 'ferias' ? 'ferias' : 
              log.tabela === 'batidas_ponto' ? 'ponto' :
              log.tabela === 'colaboradores' ? 'admissao' : 'alerta'
      }));

      const complianceEvents = (complianceResponse.data || []).map((log: any) => ({
        id: log.id,
        title: `Alerta Portaria 671: ${log.tipo_alerta.toUpperCase()}`,
        description: log.descricao,
        time: format(new Date(log.timestamp), "HH:mm, dd MMM", { locale: ptBR }),
        raw_time: log.timestamp,
        type: log.tipo_alerta === 'geofencing' ? 'geofencing' :
              log.tipo_alerta === 'timezone' ? 'timezone' : 'compliance'
      }));

      return [...auditEvents, ...complianceEvents].sort((a, b) => 
        new Date(b.raw_time).getTime() - new Date(a.raw_time).getTime()
      );
    }
  });

  useRealTimeSubscription('audit_log', ['audit-timeline', empresaId], empresaId);
  useRealTimeSubscription('conformidade_ponto_logs', ['audit-timeline', empresaId], empresaId);

  const displayEvents = useMemo(() => {
    const list = dbEvents || initialEvents || [];
    const filtered = filterType === 'all' ? list : list.filter(e => e.type === filterType);
    
    return filtered.sort((a, b) => {
      const timeA = a.raw_time ? new Date(a.raw_time).getTime() : 0;
      const timeB = b.raw_time ? new Date(b.raw_time).getTime() : 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [dbEvents, initialEvents, filterType, sortOrder]);

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-2 bg-muted rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="p-3 rounded-2xl bg-muted/50 mb-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-caption text-muted-foreground font-body">Nenhum evento recente</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
          {['all', 'admissao', 'ferias', 'ponto', 'compliance', 'alerta'].map((t) => (
            <Badge 
              key={t}
              variant={filterType === t ? 'default' : 'outline'}
              className="cursor-pointer capitalize text-[10px] px-2 py-0"
              onClick={() => setFilterType(t)}
            >
              {t === 'all' ? 'Tudo' : t}
            </Badge>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ordenar"
          className="h-6 w-6 shrink-0"
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
        >
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-0 relative">
        <AnimatePresence mode="popLayout">
          {displayEvents.map((event, i) => {
            const config = eventConfig[event.type] || eventConfig.alerta;
            const Icon = config.icon;
            const isLast = i === displayEvents.length - 1;

            return (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-3 group"
              >
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={cn('p-1.5 rounded-lg bg-gradient-to-br shadow-xs', config.gradient)}>
                    <Icon className="h-3 w-3 text-primary-foreground" />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-border/40 my-1" />
                  )}
                </div>

                {/* Content */}
                <div className={cn('pb-4 min-w-0', isLast && 'pb-0')}>
                  <p className="text-body font-body font-medium truncate leading-tight">{event.title}</p>
                  <p className="text-caption text-muted-foreground font-body truncate">{event.description}</p>
                  <p className="text-[10px] text-muted-foreground/60 font-body mt-0.5">{event.time}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
});
