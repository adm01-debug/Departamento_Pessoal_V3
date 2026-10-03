import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface PontoWeekSummaryProps {
  registrosSemana: Pick<
    Tables<'registros_ponto'>,
    'id' | 'data' | 'horas_trabalhadas' | 'horas_extras' | 'atraso_minutos'
  >[];
}

function formatInterval(val: string | null | undefined) {
  if (!val) return '00:00';
  if (typeof val === 'string') {
    const match = val.match(/(\d+):(\d+)/);
    return match ? `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}` : '00:00';
  }
  return '00:00';
}

export function PontoWeekSummary({ registrosSemana }: PontoWeekSummaryProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" /> Últimos 7 dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {registrosSemana.length > 0 ? (
            <div className="space-y-2">
              {registrosSemana.slice(0, 7).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-body font-medium">
                      {new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-body">
                    <span className="text-success font-medium">{formatInterval(r.horas_trabalhadas)}</span>
                    {r.horas_extras && formatInterval(r.horas_extras) !== '00:00' && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-info">
                        +{formatInterval(r.horas_extras)}
                      </Badge>
                    )}
                    {(r.atraso_minutos ?? 0) > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                        {r.atraso_minutos}m
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
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
