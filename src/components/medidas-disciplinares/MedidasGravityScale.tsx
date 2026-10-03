import type { MedidaDisciplinarComColaborador } from '@/types/medidasDisciplinares';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';

interface GravityScaleProps {
  medidas: MedidaDisciplinarComColaborador[];
}

const levels = [
  { tipo: 'advertencia_verbal', label: 'Adv. Verbal', weight: 1, color: 'bg-warning/60' },
  { tipo: 'advertencia_escrita', label: 'Adv. Escrita', weight: 2, color: 'bg-accent' },
  { tipo: 'suspensao', label: 'Suspensão', weight: 3, color: 'bg-destructive/60' },
  { tipo: 'justa_causa', label: 'Justa Causa', weight: 4, color: 'bg-destructive' },
];

export function MedidasGravityScale({ medidas }: GravityScaleProps) {
  const total = medidas.length || 1;

  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" />
          Distribuição por Gravidade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-3">
            {levels.map((level, i) => {
              const count = medidas.filter((m) => m.tipo === level.tipo).length;
              const pct = Math.round((count / total) * 100);
              return (
                <Tooltip key={level.tipo}>
                  <TooltipTrigger asChild>
                    <div className="space-y-1 cursor-default">
                      <div className="flex justify-between text-xs font-body">
                        <span className="text-muted-foreground">{level.label}</span>
                        <span className="font-medium">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${level.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    Peso de gravidade: {level.weight}/4 — {count} {count === 1 ? 'ocorrência' : 'ocorrências'}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Escala progressiva visual */}
          <div className="mt-4 pt-3 border-t border-border/20">
            <p className="text-[10px] text-muted-foreground font-body mb-2">Escala de progressão disciplinar (CLT)</p>
            <div className="flex items-center gap-1">
              {levels.map((level, i) => (
                <div key={level.tipo} className="flex items-center gap-1">
                  <div className={`h-3 flex-1 rounded-xs ${level.color} min-w-[40px]`} />
                  {i < levels.length - 1 && <span className="text-[10px] text-muted-foreground/50">→</span>}
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
