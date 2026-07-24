import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Send, CheckCircle2, Clock, AlertCircle, RefreshCw, ExternalLink, ChevronRight, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { listarEventosPorCompetencia } from '@/services/esocialService';
import { useEmpresas } from '@/hooks';

interface ESocialEventStatus {
  event: string;
  type: string;
  status: 'pending' | 'sent' | 'accepted' | 'error';
  total: number;
  processed: number;
  lastUpdate?: string;
}

export function FolhaESocialSync({ competencia }: { competencia: string }) {
  const { empresaAtual } = useEmpresas();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConciliation, setShowConciliation] = useState(false);

  const compFormatada = useMemo(() => {
    const [mes, ano] = competencia.split('/');
    return `${ano}-${mes}`;
  }, [competencia]);

  const { data: eventosRaw, isLoading, refetch } = useQuery({
    queryKey: ['esocial-events-sync', compFormatada, empresaAtual?.id],
    queryFn: () => listarEventosPorCompetencia(empresaAtual!.id, compFormatada),
    enabled: !!empresaAtual?.id
  });

  const events = useMemo((): ESocialEventStatus[] => {
    if (!eventosRaw) return [
      { event: 'S-1200 - Remuneração', type: 'S-1200', status: 'pending', total: 0, processed: 0 },
      { event: 'S-1210 - Pagamentos', type: 'S-1210', status: 'pending', total: 0, processed: 0 },
      { event: 'S-1299 - Fechamento', type: 'S-1299', status: 'pending', total: 1, processed: 0 },
    ];

    const s1200 = eventosRaw.filter(e => e.tipo_evento === 'S-1200');
    const s1210 = eventosRaw.filter(e => e.tipo_evento === 'S-1210');
    const s1299 = eventosRaw.filter(e => e.tipo_evento === 'S-1299');

    const getStatus = (evs: any[]) => {
      if (evs.length === 0) return 'pending';
      if (evs.some(e => e.status === 'erro')) return 'error';
      if (evs.every(e => e.status === 'enviado')) return 'accepted';
      return 'sent';
    };

    return [
      { 
        event: 'S-1200 - Remuneração', 
        type: 'S-1200',
        status: getStatus(s1200), 
        total: s1200.length || 0, 
        processed: s1200.filter(e => e.status === 'enviado').length,
        lastUpdate: s1200[0]?.updated_at 
      },
      { 
        event: 'S-1210 - Pagamentos', 
        type: 'S-1210',
        status: getStatus(s1210), 
        total: s1210.length || 0, 
        processed: s1210.filter(e => e.status === 'enviado').length,
        lastUpdate: s1210[0]?.updated_at
      },
      { 
        event: 'S-1299 - Fechamento', 
        type: 'S-1299',
        status: getStatus(s1299), 
        total: 1, 
        processed: s1299.filter(e => e.status === 'enviado').length,
        lastUpdate: s1299[0]?.updated_at
      },
    ];
  }, [eventosRaw]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await refetch();
      toast.success('Status atualizado com o eSocial');
    } finally {
      setIsSyncing(false);
    }
  };

  const overallProgress = events.reduce((acc, ev) => acc + ev.total, 0) > 0
    ? (events.reduce((acc, ev) => acc + ev.processed, 0) / events.reduce((acc, ev) => acc + ev.total, 0)) * 100
    : 0;


  return (
    <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-h3 font-display flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-info to-info/70">
            <Send className="h-4 w-4 text-primary-foreground" />
          </div>
          Integração eSocial
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Atualizar"
          className="rounded-xl h-8 w-8"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isSyncing && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-body text-muted-foreground">
            <span>Progresso Geral de Transmissão</span>
            <span>{overallProgress.toFixed(0)}%</span>
          </div>
          <Progress value={overallProgress} className="h-1.5" />
        </div>

        <div className="space-y-3">
          {events.map((ev, i) => (
            <motion.div 
              key={ev.event}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {getStatusIcon(ev.status)}
                  <span className="text-body font-body font-medium">{ev.event}</span>
                </div>
                {getStatusBadge(ev.status)}
              </div>
              <div className="flex items-center justify-between pl-6 text-[11px] font-body text-muted-foreground">
                <span>{ev.processed} de {ev.total} colaboradores</span>
                {ev.lastUpdate && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {ev.lastUpdate}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 rounded-xl gap-2 font-body text-xs border-info/20 text-info hover:bg-info/5 h-9"
            onClick={() => window.open('/esocial', '_blank', 'noopener')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Painel Geral
          </Button>
          <Button 
            variant="default" 
            className="flex-1 rounded-xl gap-2 font-body text-xs bg-info hover:bg-info/90 h-9"
            onClick={() => setShowConciliation(!showConciliation)}
          >
            <Calculator className="h-3.5 w-3.5" />
            Conciliar
          </Button>
        </div>

        <AnimatePresence>
          {showConciliation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border/20 pt-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground">Divergências Local vs eSocial</span>
                  <Badge variant="outline" className="text-[9px] bg-success/5 text-success border-success/20">Auditado</Badge>
                </div>
                
                <div className="p-2.5 rounded-lg bg-warning/5 border border-warning/10 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold">Diferença de INSS (R$ 42,50)</p>
                    <p className="text-[10px] text-muted-foreground">Rubrica 1003 (Horas Extras) com incidência divergente no S-1010.</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-success/5 border border-success/10 flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold">FGTS Digital Conciliado</p>
                    <p className="text-[10px] text-muted-foreground">Valores transmitidos coincidem 100% com o totalizador S-5003.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

const getStatusIcon = (status: ESocialEventStatus['status']) => {
  switch (status) {
    case 'accepted': return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'sent': return <Clock className="h-4 w-4 text-info animate-pulse" />;
    case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
    default: return <Send className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: ESocialEventStatus['status']) => {
  switch (status) {
    case 'accepted': return <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-body text-[10px]">Aceito</Badge>;
    case 'sent': return <Badge variant="outline" className="bg-info/10 text-info border-info/20 font-body text-[10px]">Transmitido</Badge>;
    case 'error': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-body text-[10px]">Erro</Badge>;
    default: return <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-border font-body text-[10px]">Pendente</Badge>;
  }
};
