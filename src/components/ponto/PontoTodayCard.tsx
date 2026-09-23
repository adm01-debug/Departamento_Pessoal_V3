import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Timer, Clock, AlertTriangle, Coffee, BrainCircuit, Pencil, Plus, Minus, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { turnoService } from '@/services/turnoService';
import { EditarEscalaDialog } from '@/components/ponto/EditarEscalaDialog';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { hierarquiaItemVariants } from '@/components/colaborador-detalhes/TrabalhoHierarquiaTab';

interface PontoTodayCardProps {
  registroHoje: any;
  colaboradorId: string;
  colaboradorNome?: string;
  empresaId?: string;
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

/** Capitaliza a primeira letra (date-fns/ptBR devolve dia da semana em minúsculas). */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function PontoTodayCard({ registroHoje, colaboradorId, colaboradorNome, empresaId }: PontoTodayCardProps) {
  const [editarEscalaAberto, setEditarEscalaAberto] = useState(false);
  const hojeStr = format(new Date(), 'yyyy-MM-dd');

  const { data: escalaHoje, isLoading: isLoadingEscala } = useQuery({
    queryKey: ['escala-hoje', colaboradorId, empresaId, hojeStr],
    queryFn: () => turnoService.obterEscalaDoDia(colaboradorId, empresaId!, hojeStr),
    enabled: !!colaboradorId && !!empresaId,
  });

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

  // Linha do tempo horizontal: achata as batidas em ordem cronológica
  // (Entrada/Saída alternados), com um marcador pendente quando o par
  // mais recente ainda está aberto.
  const eventos = useMemo(() => {
    if (!registroHoje) return [] as { hora: string | null; label: string; tipo: 'entrada' | 'saida' }[];
    const raw = [
      registroHoje.entrada_1, registroHoje.saida_1,
      registroHoje.entrada_2, registroHoje.saida_2,
      registroHoje.entrada_3, registroHoje.saida_3,
    ];
    const evts: { hora: string | null; label: string; tipo: 'entrada' | 'saida' }[] = [];
    raw.forEach((hora, i) => {
      if (hora) {
        evts.push({ hora, label: i % 2 === 0 ? 'Entrada' : 'Saída', tipo: i % 2 === 0 ? 'entrada' : 'saida' });
      }
    });
    if (evts.length > 0 && evts[evts.length - 1].tipo === 'entrada') {
      evts.push({ hora: null, label: 'Saída', tipo: 'saida' });
    }
    return evts;
  }, [registroHoje]);

  const hojeFormatado = capitalize(format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }));

  return (
    <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible">
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5">
                <Timer className="h-6 w-6 text-info" />
                <span className="font-display font-semibold text-lg">Hoje</span>
              </div>
              <span className="text-xs text-muted-foreground font-body hidden sm:inline">{hojeFormatado}</span>
              {registroHoje?.atraso_minutos > 0 && (
                <Badge variant="warning" className="text-[10px] gap-1 py-1 rounded-lg border border-warning/20">
                  <AlertTriangle className="h-3 w-3" /> Atraso · {registroHoje.atraso_minutos} min
                </Badge>
              )}
            </div>
            {!isLoadingEscala && (
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs font-medium tracking-wide bg-muted/50 px-3 py-1.5 rounded-full">
                  {escalaHoje?.turno
                    ? `Escala: ${escalaHoje.turno.horario_inicio.slice(0, 5)} - ${escalaHoje.turno.horario_fim.slice(0, 5)}`
                    : 'Escala não definida'}
                </Badge>
                {colaboradorId && empresaId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    aria-label="Editar escala"
                    onClick={() => setEditarEscalaAberto(true)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {colaboradorId && empresaId && (
            <EditarEscalaDialog
              open={editarEscalaAberto}
              onOpenChange={setEditarEscalaAberto}
              colaboradorId={colaboradorId}
              colaboradorNome={colaboradorNome}
              empresaId={empresaId}
              data={hojeStr}
              escalaAtual={escalaHoje || null}
            />
          )}

          {registroHoje ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium uppercase text-muted-foreground">
                  <span>Progresso da Jornada</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r",
                      progress > 100 ? "from-red-900 to-destructive" : "from-success to-primary"
                    )}
                  />
                </div>
              </div>

              {estimatedEndTime && !registroHoje.saida_1 && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-[10px] font-medium uppercase text-primary">Previsão de Saída IA</span>
                  </div>
                  <Badge variant="secondary" className="font-display font-medium text-sm bg-background/50">
                    {estimatedEndTime}
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_auto_1fr] gap-6 items-stretch">
                <div className="grid grid-cols-3 gap-4">
                  <div className="min-h-20 px-4 py-2.5 rounded-2xl bg-success/5 border border-success/10 flex items-center gap-3 group hover:bg-success/10 transition-colors">
                    <div className="h-12 w-12 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-display font-semibold text-success tabular-nums leading-tight truncate">{formatInterval(registroHoje.horas_trabalhadas)}</p>
                      <p className="text-xs text-muted-foreground font-medium uppercase leading-tight">Trabalhadas</p>
                    </div>
                  </div>
                  <div className="min-h-20 px-4 py-2.5 rounded-2xl bg-info/5 border border-info/10 flex items-center gap-3 group hover:bg-info/10 transition-colors">
                    <div className="h-12 w-12 rounded-full bg-info/15 text-info flex items-center justify-center shrink-0">
                      <Plus className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-display font-semibold text-info tabular-nums leading-tight truncate">{formatInterval(registroHoje.horas_extras)}</p>
                      <p className="text-xs text-muted-foreground font-medium uppercase leading-tight">Extras</p>
                    </div>
                  </div>
                  <div className="min-h-20 px-4 py-2.5 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center gap-3 group hover:bg-red-500/10 transition-colors">
                    <div className="h-12 w-12 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
                      <Minus className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-display font-semibold text-red-500 tabular-nums leading-tight truncate">{formatInterval(registroHoje.horas_falta)}</p>
                      <p className="text-xs text-muted-foreground font-medium uppercase leading-tight">Débito</p>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block w-px bg-border self-stretch my-2" />

                <div className="flex flex-col justify-center">
                  <span className="text-xs font-medium text-muted-foreground mb-2">Linha do tempo de hoje</span>
                  {eventos.length > 0 ? (
                    <div className="flex items-start justify-between w-full">
                      {eventos.map((ev, i) => (
                        <div key={i} className="contents">
                          <motion.div
                            custom={i * 2}
                            initial="hidden"
                            animate="visible"
                            variants={hierarquiaItemVariants}
                            className="flex flex-col items-center gap-1.5 shrink-0"
                          >
                            <span className={cn(
                              "h-2 w-2 rounded-full border-2 shrink-0",
                              ev.hora
                                ? (ev.tipo === 'entrada' ? 'bg-success border-success animate-pulse-glow-success' : 'bg-warning border-warning animate-pulse-glow-warning')
                                : 'bg-transparent border-muted-foreground'
                            )} />
                            <span className="text-base font-display font-semibold text-foreground tabular-nums whitespace-nowrap">{ev.hora || '--:--'}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{ev.label}</span>
                          </motion.div>
                          {i < eventos.length - 1 && (
                            <motion.div
                              custom={i * 2 + 1}
                              initial="hidden"
                              animate="visible"
                              variants={hierarquiaItemVariants}
                              className="flex-1 flex items-center justify-center mt-3.5"
                            >
                              <ArrowRight className="h-5 w-7 text-muted-foreground/40 shrink-0" />
                            </motion.div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center py-3">
                      <p className="text-xs text-muted-foreground font-body">Aguardando primeira batida</p>
                    </div>
                  )}

                  {registroHoje.saida_intervalo && !registroHoje.retorno_intervalo && (
                    <div className="flex items-center gap-2 p-1.5 mt-3 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 animate-pulse w-fit">
                      <Coffee className="h-3 w-3" />
                      <span className="text-[9px] font-medium uppercase">Em Intervalo de Almoço</span>
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
              <p className="text-sm font-display font-medium text-foreground">A jornada ainda não começou</p>
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
