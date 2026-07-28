import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Timer, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight, Coffee, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface PontoTodayCardProps {
  registroHoje: any;
}

function formatInterval(val: any) {
  if (!val) return '00:00';
  if (typeof val === 'string') {
    const match = val.match(/(\d+):(\d+)/);
    return match ? `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}` : '00:00';
  }
  return '00:00';
}

function timeToMinutes(time: string) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function PontoTodayCard({ registroHoje }: PontoTodayCardProps) {
  const progress = useMemo(() => {
    if (!registroHoje || !registroHoje.entrada_esperada || !registroHoje.saida_esperada) return 0;
    
    const startMins = timeToMinutes(registroHoje.entrada_esperada);
    const endMins = timeToMinutes(registroHoje.saida_esperada);
    const totalMins = endMins - startMins;
    
    if (totalMins <= 0) return 0;

    const workedMins = timeToMinutes(formatInterval(registroHoje.horas_trabalhadas));
    const p = (workedMins / totalMins) * 100;
    return Math.min(100, Math.max(0, p));
  }, [registroHoje]);
  
  const estimatedEndTime = useMemo(() => {
    if (!registroHoje || !registroHoje.entrada_1 || !registroHoje.entrada_esperada || !registroHoje.saida_esperada) return null;
    
    const [eh, em] = registroHoje.entrada_esperada.split(':').map(Number);
    const [sh, sm] = registroHoje.saida_esperada.split(':').map(Number);
    const expectedDurationMins = (sh * 60 + sm) - (eh * 60 + em);
    
    const [h1, m1] = registroHoje.entrada_1.split(':').map(Number);
    const startMins = h1 * 60 + m1;
    
    // Add lunch time if already taken or expected
    let lunchMins = 60; // default 1h
    if (registroHoje.saida_intervalo && registroHoje.retorno_intervalo) {
      const [sh_int, sm_int] = registroHoje.saida_intervalo.split(':').map(Number);
      const [rh_int, rm_int] = registroHoje.retorno_intervalo.split(':').map(Number);
      lunchMins = (rh_int * 60 + rm_int) - (sh_int * 60 + sm_int);
    }
    
    const totalDurationMins = startMins + expectedDurationMins + lunchMins;
    const endH = Math.floor(totalDurationMins / 60) % 24;
    const endM = totalDurationMins % 60;
    
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }, [registroHoje]);

  const pares = registroHoje ? [
    { e: registroHoje.entrada_1, s: registroHoje.saida_1, label: 'Turno 1' },
    { e: registroHoje.entrada_2, s: registroHoje.saida_2, label: 'Turno 2' },
    { e: registroHoje.entrada_3, s: registroHoje.saida_3, label: 'Turno 3' },
  ].filter(p => p.e || p.s) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden h-full">
        <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
        <CardHeader className="pb-2">
          <CardTitle className="font-display flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-info" /> Hoje
            </div>
            {registroHoje?.entrada_esperada && (
              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-muted/50">
                Escala: {registroHoje.entrada_esperada} - {registroHoje.saida_esperada}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {registroHoje ? (
            <>
              {/* Progress Tracker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                  <span>Progresso da Jornada</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={cn(
                      "h-full rounded-full transition-all",
                      progress > 100 ? "bg-destructive" : "bg-primary"
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 rounded-2xl bg-success/5 border border-success/10 text-center group hover:bg-success/10 transition-colors">
                  <p className="text-lg font-display font-bold text-success tabular-nums">{formatInterval(registroHoje.horas_trabalhadas)}</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">Trabalhadas</p>
                </div>
                <div className="p-2.5 rounded-2xl bg-info/5 border border-info/10 text-center group hover:bg-info/10 transition-colors">
                  <p className="text-lg font-display font-bold text-info tabular-nums">{formatInterval(registroHoje.horas_extras)}</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">Extras</p>
                </div>
                <div className="p-2.5 rounded-2xl bg-destructive/5 border border-destructive/10 text-center group hover:bg-destructive/10 transition-colors">
                  <p className="text-lg font-display font-bold text-destructive tabular-nums">{formatInterval(registroHoje.horas_falta)}</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase">Débito</p>
                </div>
              </div>

              {(registroHoje.atraso_minutos > 0 || registroHoje.saida_antecipada_minutos > 0) && (
                <div className="flex flex-wrap gap-2">
                  {registroHoje.atraso_minutos > 0 && (
                    <Badge variant="destructive" className="text-[10px] gap-1 py-1 rounded-lg">
                      <AlertTriangle className="h-3 w-3" /> Atraso: {registroHoje.atraso_minutos}min
                    </Badge>
                  )}
                  {registroHoje.saida_antecipada_minutos > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-1 py-1 rounded-lg border-warning/30 text-warning">
                      <ArrowUpRight className="h-3 w-3" /> Saída antecipada
                    </Badge>
                  )}
                </div>
              )}

              {estimatedEndTime && !registroHoje.saida_1 && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-[10px] font-bold uppercase text-primary">Previsão de Saída IA</span>
                  </div>
                  <Badge variant="secondary" className="font-display font-bold text-sm bg-background/50">
                    {estimatedEndTime}
                  </Badge>
                </div>
              )}

              <div className="space-y-2.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Linha do Tempo
                </p>
                <div className="space-y-2">
                  {pares.length > 0 ? pares.map((p, i) => (
                    <div key={i} className="group relative flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/40 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">{p.label} - In</span>
                          <div className="flex items-center gap-1.5">
                            <ArrowDownRight className="h-3 w-3 text-success" />
                            <span className="text-sm font-display font-bold">{p.e || '--:--'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="h-8 w-[1px] bg-border/40" />
                      
                      <div className="flex items-center gap-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">{p.label} - Out</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-display font-bold">{p.s || '--:--'}</span>
                            <ArrowUpRight className="h-3 w-3 text-destructive" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-4 rounded-xl border border-dashed border-border/40 bg-muted/5">
                      <p className="text-sm text-muted-foreground font-body">Aguardando primeira batida</p>
                    </div>
                  )}
                  
                  {registroHoje.saida_intervalo && !registroHoje.retorno_intervalo && (
                    <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 animate-pulse">
                      <Coffee className="h-3 w-3" />
                      <span className="text-[10px] font-bold uppercase">Em Intervalo de Almoço</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative p-4 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-xl">
                  <Clock className="h-10 w-10 text-primary animate-pulse" />
                </div>
              </div>
              <p className="text-sm font-display font-bold text-foreground">A jornada ainda não começou</p>
              <p className="text-xs text-muted-foreground font-body mt-2 text-center max-w-[200px]">
                Registre sua entrada no botão acima para iniciar o monitoramento.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
