import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { ClipboardList, Target, Users, TrendingUp, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export function PerformanceDashboard({ stats, feedbacks, metas }: { stats: any, feedbacks: any[], metas: any[] }) {
  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

  const feedbackDistrib = useMemo(() => {
    const counts: any = {};
    feedbacks.forEach(f => {
      const nota = Math.round(f.nota_geral || 0);
      counts[nota] = (counts[nota] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: `${name} Estrelas`, value }));
  }, [feedbacks]);

  const metasProgress = useMemo(() => {
    return metas.slice(0, 5).map(m => ({
      name: m.titulo.length > 20 ? m.titulo.substring(0, 20) + '...' : m.titulo,
      progresso: m.valor_objetivo > 0 ? (m.valor_atual / m.valor_objetivo) * 100 : 0
    }));
  }, [metas]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Ciclos', value: stats.ciclos, icon: ClipboardList, color: 'text-primary', gradient: 'from-primary to-primary-glow' },
          { label: 'Metas', value: stats.metas, icon: Target, color: 'text-success', gradient: 'from-success to-success/70' },
          { label: 'Feedbacks', value: stats.feedbacks, icon: Users, color: 'text-info', gradient: 'from-info to-info/70' },
          { label: 'PDIs', value: stats.pdis, icon: TrendingUp, color: 'text-warning', gradient: 'from-warning to-warning/70' },
          { label: 'Competências', value: stats.competencias, icon: Star, color: 'text-destructive', gradient: 'from-destructive to-destructive/70' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border border-border/30 rounded-2xl overflow-hidden text-center hover:shadow-elevated transition-all">
              <div className={`h-[2px] bg-gradient-to-r ${kpi.gradient}`} />
              <CardContent className="pt-4">
                <kpi.icon className={`h-6 w-6 mx-auto ${kpi.color} mb-1`} />
                <p className="text-2xl font-medium">{kpi.value}</p>
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
              <Star className="h-4 w-4 text-warning" /> Distribuição de Notas (Feedbacks)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feedbackDistrib}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {feedbackDistrib.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
          <CardHeader className="bg-muted/30 pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Progresso de Metas (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metasProgress} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted))" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" fontSize={10} width={100} />
                  <Tooltip />
                  <Bar dataKey="progresso" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
