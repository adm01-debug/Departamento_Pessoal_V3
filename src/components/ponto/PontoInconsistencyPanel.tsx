import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, Clock, Zap, CheckCircle2, ShieldAlert, 
  ArrowRight, MessageSquare, Edit3, CheckCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Inconsistency {
  id: string;
  colaborador_id: string;
  colaborador: string;
  data: string;
  tipo: 'forgotten_out' | 'short_break' | 'geofence' | 'excessive_overtime' | 'fatigue_risk';
  descricao: string;
  gravidade: 'high' | 'medium' | 'low';
}

export function PontoInconsistencyPanel({ registros }: { registros: any[] }) {
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  const detectInconsistencies = (): Inconsistency[] => {
    const list: Inconsistency[] = [];
    
    registros.forEach(r => {
      if (resolvedIds.includes(`f-${r.id}`) || resolvedIds.includes(`b-${r.id}`) || resolvedIds.includes(`e-${r.id}`)) return;

      // 1. Forgotten Clock-out
      if (r.entrada_1 && !r.saida_1) {
        const dataBatida = new Date(`${r.data}T${r.entrada_1}`);
        const agora = new Date();
        const diffHoras = (agora.getTime() - dataBatida.getTime()) / (1000 * 60 * 60);
        
        if (diffHoras > 12) {
          list.push({
            id: `f-${r.id}`,
            colaborador_id: r.colaborador_id,
            colaborador: r.colaborador?.nome_completo || 'Colaborador',
            data: r.data,
            tipo: 'forgotten_out',
            descricao: 'Possível esquecimento de saída (mais de 12h em aberto)',
            gravidade: 'high'
          });
        }
      }

      // 2. Short Break (CLT: min 1h for >6h work)
      if (r.saida_intervalo && r.retorno_intervalo) {
        const [h1, m1] = r.saida_intervalo.split(':').map(Number);
        const [h2, m2] = r.retorno_intervalo.split(':').map(Number);
        const min1 = h1 * 60 + m1;
        const min2 = h2 * 60 + m2;
        const diff = min2 - min1;
        
        if (diff > 0 && diff < 60) {
          list.push({
            id: `b-${r.id}`,
            colaborador_id: r.colaborador_id,
            colaborador: r.colaborador?.nome_completo || 'Colaborador',
            data: r.data,
            tipo: 'short_break',
            descricao: `Intervalo curto: ${diff}min (Mínimo legal 60min)`,
            gravidade: 'medium'
          });
        }
      }

      // 3. Excessive Overtime (>2h)
      if (r.horas_extras) {
        const extrasStr = String(r.horas_extras);
        const match = extrasStr.match(/(\d+):/);
        if (match && parseInt(match[1]) >= 2) {
          list.push({
            id: `e-${r.id}`,
            colaborador_id: r.colaborador_id,
            colaborador: r.colaborador?.nome_completo || 'Colaborador',
            data: r.data,
            tipo: 'excessive_overtime',
            descricao: 'Hora extra excedente ao limite legal (2h/dia)',
            gravidade: 'medium'
          });
        }
      }
    });
    
    // 4. Predictive Fatigue (Last 7 days excessive overtime)
    const overtimeByColab: Record<string, { mins: number, count: number, name: string }> = {};
    registros.forEach(r => {
      if (r.horas_extras) {
        const match = String(r.horas_extras).match(/(\d+):(\d+)/);
        if (match) {
          const mins = parseInt(match[1]) * 60 + parseInt(match[2]);
          const colabId = r.colaborador_id;
          if (!overtimeByColab[colabId]) overtimeByColab[colabId] = { mins: 0, count: 0, name: r.colaborador?.nome_completo || 'Colaborador' };
          overtimeByColab[colabId].mins += mins;
          overtimeByColab[colabId].count++;
        }
      }
    });

    Object.entries(overtimeByColab).forEach(([id, data]) => {
      if (data.mins > 480 && !resolvedIds.includes(`fatigue-${id}`)) {
        list.push({
          id: `fatigue-${id}`,
          colaborador_id: id,
          colaborador: data.name,
          data: 'Alertas IA',
          tipo: 'fatigue_risk',
          descricao: `Risco de Fadiga: ${Math.round(data.mins / 60)}h extras no período (Prevenção Burnout)`,
          gravidade: 'medium'
        });
      }
    });

    return list;
  };

  const handleResolve = (id: string, action: string) => {
    toast.success(`Ação "${action}" executada com sucesso!`);
    setResolvedIds(prev => [...prev, id]);
  };

  const inconsistencies = detectInconsistencies();

  if (inconsistencies.length === 0) return (
    <AnimatePresence>
      {resolvedIds.length > 0 && inconsistencies.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-success/30 bg-success/5 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-full text-success"><CheckCircle2 className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm font-bold text-success-foreground">Tudo em conformidade!</p>
                  <p className="text-[10px] text-muted-foreground">Você resolveu {resolvedIds.length} inconsistências hoje.</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-[10px]" onClick={() => setResolvedIds([])}>Ver histórico</Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <Card className="border-warning/30 bg-warning/5 shadow-xs mb-6 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-warning/40 via-warning to-warning/40" />
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-display flex items-center gap-2 text-warning-foreground">
          <Zap className="h-4 w-4 fill-warning" /> 
          Insights de Inteligência: {inconsistencies.length} Conflitos Identificados
        </CardTitle>
        <Badge variant="outline" className="text-[10px] bg-warning/20 border-warning/30 text-warning-foreground animate-pulse">
          Resolução Assistida Ativa
        </Badge>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {inconsistencies.slice(0, 6).map((inc) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, x: 20 }}
                key={inc.id} 
                className="group relative bg-background/95 p-3 rounded-xl border border-border/60 shadow-xs hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn("mt-0.5 p-2 rounded-lg transition-colors", 
                    inc.tipo === 'fatigue_risk' ? 'bg-info/10 text-info' : 
                    inc.gravidade === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                  )}>
                    {inc.tipo === 'fatigue_risk' ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">{inc.colaborador}</p>
                      <span className="text-[9px] text-muted-foreground font-mono bg-muted/50 px-1 rounded">{inc.data}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{inc.descricao}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-auto border-t pt-2 border-border/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {inc.tipo === 'forgotten_out' && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-[9px] px-2 gap-1 rounded-lg" onClick={() => handleResolve(inc.id, 'Sugerir Saída')}>
                        <Edit3 className="h-3 w-3" /> Sugerir Saída
                      </Button>
                      <Button size="sm" variant="secondary" className="h-7 text-[9px] px-2 gap-1 rounded-lg" onClick={() => handleResolve(inc.id, 'Cobrar Justificativa')}>
                        <MessageSquare className="h-3 w-3" /> Cobrar
                      </Button>
                    </>
                  )}
                  {inc.tipo === 'short_break' && (
                    <Button size="sm" variant="outline" className="h-7 text-[9px] px-2 gap-1 rounded-lg bg-warning/5 border-warning/20 text-warning-foreground" onClick={() => handleResolve(inc.id, 'Aprovar Exceção')}>
                      <CheckCircle className="h-3 w-3" /> Aprovar Exceção
                    </Button>
                  )}
                  {inc.tipo === 'fatigue_risk' && (
                    <Button size="sm" variant="outline" className="h-7 text-[9px] px-2 gap-1 rounded-lg bg-info/5 border-info/20 text-info" onClick={() => handleResolve(inc.id, 'Notificar Gestor')}>
                      <Bell className="h-3 w-3" /> Alerta Gestor
                    </Button>
                  )}
                  {inc.tipo === 'excessive_overtime' && (
                    <Button size="sm" variant="outline" className="h-7 text-[9px] px-2 gap-1 rounded-lg" onClick={() => handleResolve(inc.id, 'Compensar Banco')}>
                      <Zap className="h-3 w-3" /> Compensar
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button variant="ghost" size="icon" aria-label="Ignorar" className="h-7 w-7 rounded-lg hover:bg-success/10 hover:text-success" onClick={() => handleResolve(inc.id, 'Ignorar')}>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {inconsistencies.length > 6 && (
            <motion.div layout className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border/60 bg-muted/5">
              <p className="text-[11px] text-muted-foreground font-bold mb-1">
                + {inconsistencies.length - 6} CONFLITOS
              </p>
              <Button variant="link" size="sm" className="h-6 text-[10px] p-0 hovre:no-underline">Ver lista completa</Button>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Bell(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
