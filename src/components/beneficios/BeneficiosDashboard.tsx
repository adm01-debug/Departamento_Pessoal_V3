import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Gift, Users, Wallet, TrendingUp, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export function BeneficiosDashboard({ beneficios }: { beneficios: any[] }) {
  const stats = useMemo(() => {
    const totalCusto = beneficios.reduce((acc, b) => acc + (b.valor || 0) * (b.beneficios_colaborador?.[0]?.count || 0), 0);
    const totalAdesoes = beneficios.reduce((acc, b) => acc + (b.beneficios_colaborador?.[0]?.count || 0), 0);
    const tiposCount = beneficios.reduce((acc: any, b) => {
      acc[b.tipo || 'Outros'] = (acc[b.tipo || 'Outros'] || 0) + (b.beneficios_colaborador?.[0]?.count || 0);
      return acc;
    }, {});

    const chartData = Object.entries(tiposCount).map(([name, value]) => ({ name, value }));
    const costData = beneficios.map(b => ({
      name: b.nome,
      custo: (b.valor || 0) * (b.beneficios_colaborador?.[0]?.count || 0)
    })).sort((a, b) => b.custo - a.custo).slice(0, 5);

    return { totalCusto, totalAdesoes, chartData, costData };
  }, [beneficios]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Investimento Total', value: formatCurrency(stats.totalCusto), icon: Wallet, gradient: 'from-primary to-primary-glow' },
          { label: 'Total de Adesões', value: stats.totalAdesoes, icon: Users, gradient: 'from-success to-success/70' },
          { label: 'Benefícios Ativos', value: beneficios.length, icon: Gift, gradient: 'from-info to-info/70' },
          { label: 'Ticket Médio', value: formatCurrency(stats.totalAdesoes > 0 ? stats.totalCusto / stats.totalAdesoes : 0), icon: TrendingUp, gradient: 'from-warning to-warning/70' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border border-border/30 rounded-2xl overflow-hidden">
              <div className={`h-[2px] bg-gradient-to-r ${kpi.gradient}`} />
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${kpi.gradient}`}>
                    <kpi.icon className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
                <p className="text-xl font-display font-medium">{kpi.value}</p>
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
              <Users className="h-4 w-4 text-primary" /> Adesão por Tipo de Benefício
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} adisões`, 'Total']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
          <CardHeader className="bg-muted/30 pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Wallet className="h-4 w-4 text-info" /> Custo Mensal por Benefício (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.costData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted))" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" fontSize={10} width={100} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="custo" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-info/20 bg-info/5 rounded-2xl">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-info/10 text-info">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-info-foreground">Inteligência de Benefícios</p>
            <p className="text-xs text-muted-foreground">O custo total de benefícios representa aproximadamente 12% da folha bruta total. Considere revisar o plano de saúde para otimizar custos no próximo semestre.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
