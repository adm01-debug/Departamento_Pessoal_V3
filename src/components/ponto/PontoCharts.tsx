import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { formatDateLocalISO } from '@/utils/dateLocal';


export function PontoCharts() {
  const { user } = useAuth();

  const { data: registros30d = [] } = useQuery({
    queryKey: ['registros-ponto-30d', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: colab } = await supabase.from('colaboradores').select('id').eq('email', user.email || '').maybeSingle();
      if (!colab) return [];
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const { data, error } = await (supabase as any)
        .from('registros_ponto')
        .select('data, atraso_minutos, horas_trabalhadas, entrada_1, entrada_esperada')
        .eq('colaborador_id', colab.id)
        .gte('data', formatDateLocalISO(d))
        .order('data', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Weekly trend data
  const weeklyTrend = useMemo(() => {
    const weeks: Record<string, { pontual: number; total: number }> = {};
    registros30d.forEach((r: any) => {
      if (!r.entrada_1) return;
      const date = new Date(r.data + 'T12:00:00');
      const weekNum = Math.ceil((date.getDate()) / 7);
      const key = `Sem ${weekNum}`;
      if (!weeks[key]) weeks[key] = { pontual: 0, total: 0 };
      weeks[key].total++;
      if (!r.atraso_minutos || r.atraso_minutos === 0) weeks[key].pontual++;
    });
    return Object.entries(weeks).map(([week, d]) => ({
      week,
      rate: d.total > 0 ? Math.round((d.pontual / d.total) * 100) : 0,
    }));
  }, [registros30d]);

  // Check-in times data
  const checkInData = useMemo(() => {
    return registros30d
      .filter((r: any) => r.entrada_1)
      .slice(-7)
      .map((r: any) => {
        const date = new Date(r.data + 'T12:00:00');
        const [h, m] = (r.entrada_1 as string).split(':').map(Number);
        const timeInMin = h * 60 + (m || 0);
        return {
          day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
          time: timeInMin,
          displayTime: r.entrada_1,
          isPunctual: !r.atraso_minutos || r.atraso_minutos === 0,
        };
      });
  }, [registros30d]);

  if (registros30d.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-info" /> Tendência Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, 'Taxa']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(var(--info))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--info))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Check-in Times */}
        <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/90" />
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-streak" /> Horários de Entrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={checkInData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis
                    domain={[420, 600]}
                    tickFormatter={(v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(_: any, __: any, props: any) => [props.payload.displayTime, 'Horário']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="time" radius={[4, 4, 0, 0]}>
                    {checkInData.map((entry: any, i: number) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={entry.isPunctual ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground font-body text-center mt-2">
              🟢 Pontual &nbsp; 🔴 Atrasado
            </p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
