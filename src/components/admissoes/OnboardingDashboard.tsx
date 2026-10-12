import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { UserPlus, Clock, CheckCircle, AlertCircle, TrendingUp, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export function OnboardingDashboard({
  admissoes,
}: {
  admissoes: Array<{ etapa: string; created_at?: string | null; updated_at?: string | null }>;
}) {
  const stats = useMemo(() => {
    const total = admissoes.length;
    const concluidas = admissoes.filter((a) => a.etapa === 'concluida').length;
    const pendentes = admissoes.filter((a) => a.etapa !== 'concluida' && a.etapa !== 'cancelada').length;
    const canceladas = admissoes.filter((a) => a.etapa === 'cancelada').length;

    const etapaData = admissoes.reduce<Record<string, number>>((acc, a) => {
      acc[a.etapa] = (acc[a.etapa] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(etapaData).map(([name, value]) => ({ name, value }));

    // Dias médios entre início (created_at) e conclusão (updated_at) das admissões
    // concluídas, agrupados pelo mês de conclusão. Vazio quando não há dados.
    const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const porMes = new Map<number, { soma: number; n: number }>();
    for (const a of admissoes) {
      if (a.etapa !== 'concluida' || !a.created_at || !a.updated_at) continue;
      const inicio = new Date(a.created_at).getTime();
      const fim = new Date(a.updated_at).getTime();
      if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim < inicio) continue;
      const mes = new Date(a.updated_at).getMonth();
      const bucket = porMes.get(mes) ?? { soma: 0, n: 0 };
      bucket.soma += (fim - inicio) / 86400000;
      bucket.n += 1;
      porMes.set(mes, bucket);
    }
    const timeToHire = [...porMes.entries()]
      .sort(([a], [b]) => a - b)
      .map(([mes, { soma, n }]) => ({ month: MESES[mes], days: Math.round((soma / n) * 10) / 10 }));

    return { total, concluidas, pendentes, canceladas, chartData, timeToHire };
  }, [admissoes]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Iniciadas', value: stats.total, icon: UserPlus, gradient: 'from-primary to-primary-glow' },
          { label: 'Em Andamento', value: stats.pendentes, icon: Clock, gradient: 'from-info to-info/70' },
          { label: 'Finalizadas', value: stats.concluidas, icon: CheckCircle, gradient: 'from-success to-success/70' },
          {
            label: 'Canceladas',
            value: stats.canceladas,
            icon: AlertCircle,
            gradient: 'from-destructive to-destructive/70',
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border border-border/30 rounded-2xl overflow-hidden">
              <div className={`h-[2px] bg-gradient-to-r ${kpi.gradient}`} />
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${kpi.gradient}`}>
                    <kpi.icon className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
                <p className="text-xl font-display font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground font-body">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
          <CardHeader className="bg-muted/30 pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Tempo Médio de Admissão (Dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              {stats.timeToHire.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground font-body">
                  Sem admissões concluídas para calcular o tempo médio.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.timeToHire}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="month" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="days"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
          <CardHeader className="bg-muted/30 pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-info" /> Funil de Onboarding por Etapa
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted))" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" fontSize={10} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
