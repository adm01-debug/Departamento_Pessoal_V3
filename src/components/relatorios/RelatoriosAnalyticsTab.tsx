import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, TrendingDown, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RePie, Pie, Cell, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

interface RelatoriosAnalyticsTabProps {
  analytics: any;
}

export function RelatoriosAnalyticsTab({ analytics }: RelatoriosAnalyticsTabProps) {
  const kpis = [
    { label: 'Colaboradores Ativos', value: analytics?.totalAtivos || 0, icon: Users, gradient: 'from-primary to-primary-glow', trend: '+5%', up: true },
    { label: 'Custo Folha Mensal', value: `R$ ${((analytics?.custoTotal || 0) / 1000).toFixed(0)}k`, icon: DollarSign, gradient: 'from-success to-success/70', trend: '+2.3%', up: true },
    { label: 'Desligamentos', value: analytics?.totalDeslig || 0, icon: TrendingDown, gradient: 'from-destructive to-destructive/70', trend: '-12%', up: false },
    { label: 'Custo Médio', value: analytics?.totalAtivos ? `R$ ${((analytics.custoTotal / analytics.totalAtivos) / 1000).toFixed(1)}k` : '—', icon: PieChart, gradient: 'from-warning to-warning/70', trend: '+1.8%', up: true },
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map(({ label, value, icon: Icon, gradient, trend, up }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/30 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("p-2 rounded-xl bg-gradient-to-br", gradient)}><Icon className="h-4 w-4 text-primary-foreground" /></div>
                  <Badge className={cn("text-[10px] border-0", up ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')}>
                    {up ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}{trend}
                  </Badge>
                </div>
                <p className="text-xl font-bold font-display">{value}</p>
                <p className="text-[10px] text-muted-foreground font-body">{label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-border/30 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Admissões vs Desligamentos</CardTitle>
            <CardDescription className="text-xs font-body">Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics?.tendencia || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="admissoes" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.3} name="Admissões" />
                <Area type="monotone" dataKey="desligamentos" stackId="2" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} name="Desligamentos" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/30 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Headcount por Departamento</CardTitle>
            <CardDescription className="text-xs font-body">Colaboradores ativos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics?.porDepartamento?.slice(0, 8) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Colaboradores" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/30 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Distribuição Salarial</CardTitle>
            <CardDescription className="text-xs font-body">Por faixa de salário</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RePie>
                <Pie data={analytics?.salarioDistribuicao || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(p: any) => `${p.name} ${((p.percent ?? 0) * 100).toFixed(0)}%`}>
                  {(analytics?.salarioDistribuicao || []).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePie>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/30 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Projeção de Custos</CardTitle>
            <CardDescription className="text-xs font-body">Estimativa mensal (salários + encargos)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={[
                { mes: 'Jan', custo: (analytics?.custoTotal || 0) * 0.95 },
                { mes: 'Fev', custo: (analytics?.custoTotal || 0) * 0.97 },
                { mes: 'Mar', custo: (analytics?.custoTotal || 0) * 0.98 },
                { mes: 'Abr', custo: (analytics?.custoTotal || 0) },
                { mes: 'Mai', custo: (analytics?.custoTotal || 0) * 1.02 },
                { mes: 'Jun', custo: (analytics?.custoTotal || 0) * 1.03 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                <Line type="monotone" dataKey="custo" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Custo Total" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
