import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/components/dashboard/MetricCard';

interface PontoWeekSummaryProps {
  registrosSemana: any[];
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

/** Saldo do dia: extras (positivo), atraso/débito (negativo) ou neutro. */
function formatSaldo(r: any): { texto: string; positivo: boolean; neutro: boolean } {
  const extras = formatInterval(r.horas_extras);
  if (timeToMinutes(extras) > 0) return { texto: `+${extras}`, positivo: true, neutro: false };

  const atrasoMin = Number(r.atraso_minutos) || 0;
  if (atrasoMin > 0) {
    const h = Math.floor(atrasoMin / 60);
    const m = atrasoMin % 60;
    return { texto: `-${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, positivo: false, neutro: false };
  }

  const falta = formatInterval(r.horas_falta);
  if (timeToMinutes(falta) > 0) return { texto: `-${falta}`, positivo: false, neutro: false };

  return { texto: '00:00', positivo: false, neutro: true };
}

export function PontoWeekSummary({ registrosSemana }: PontoWeekSummaryProps) {
  return (
    <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible" className="h-full">
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden h-full">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="font-display flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-success" /> Últimos 7 dias
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {registrosSemana.length > 0 ? (
            <div className="space-y-0.5">
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-2 pb-2 text-[9px] font-medium uppercase text-muted-foreground tracking-wider">
                <span className="truncate">Dia</span>
                <span className="text-center truncate">Trabalhado</span>
                <span className="text-center truncate">Saldo</span>
                <span className="text-center truncate">Status</span>
              </div>
              {registrosSemana.slice(0, 7).map((r: any) => {
                const saldo = formatSaldo(r);
                const atrasado = Number(r.atraso_minutos) > 0;
                return (
                  <div key={r.id} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 items-center px-2 py-1.5 rounded-lg hover:bg-background/70 transition-colors">
                    <span className="text-xs font-body font-medium truncate">
                      {new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="text-xs font-body tabular-nums truncate text-center">{formatInterval(r.horas_trabalhadas)}</span>
                    <span className={cn(
                      "text-xs font-body tabular-nums font-medium truncate text-center",
                      saldo.neutro ? "text-muted-foreground" : saldo.positivo ? "text-success" : "text-destructive"
                    )}>
                      {saldo.texto}
                    </span>
                    <span className="flex justify-center">
                      <span className={cn("h-2 w-2 rounded-full", atrasado ? "bg-destructive" : "bg-success")} />
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="p-3 rounded-2xl bg-muted/50 mb-3">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-body">Sem registros recentes</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
