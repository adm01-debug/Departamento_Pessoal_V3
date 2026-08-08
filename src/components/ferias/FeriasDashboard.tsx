import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { format, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Calendar, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FeriasDashboardProps {
  data: any[];
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#6366f1'];

export function FeriasDashboard({ data }: FeriasDashboardProps) {
  // Prepara dados para gráfico de barras (últimos 6 meses)
  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  });

  const barData = last6Months.map(month => {
    const monthStr = format(month, 'MMM', { locale: ptBR });
    const count = data.filter(f => {
      const d = new Date(f.data_inicio);
      return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
    }).length;
    return { name: monthStr, total: count };
  });

  // Prepara dados para gráfico de pizza (status)
  const statusCount = data.reduce((acc: any, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(statusCount).map(key => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: statusCount[key]
  }));

  // Próximos em gozo
  const proximos = [...data]
    .filter(f => new Date(f.data_inicio) >= new Date() && f.status === 'aprovada')
    .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
    .slice(0, 5);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-border/40 shadow-xs rounded-2xl overflow-hidden bg-gradient-to-b from-background to-muted/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <Calendar className="h-4 w-4 text-primary" /> Férias nos Últimos 6 Meses
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'currentColor', opacity: 0.6 }} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'currentColor', opacity: 0.6 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 8 }}
              />
              <Bar dataKey="total" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/40 shadow-xs rounded-2xl overflow-hidden bg-gradient-to-b from-background to-muted/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <AlertCircle className="h-4 w-4 text-primary" /> Distribuição por Status
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/40 shadow-xs rounded-2xl md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <User className="h-4 w-4 text-primary" /> Próximos Colaboradores em Gozo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!proximos.length ? (
              <p className="text-center py-12 text-muted-foreground font-body col-span-full border-2 border-dashed border-border/20 rounded-2xl">Nenhuma férias aprovada para o futuro próximo.</p>
            ) : (
              proximos.map(f => (
                <div key={f.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/30 bg-background hover:border-primary/30 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold font-display group-hover:text-primary transition-colors">{f.colaborador?.nome_completo}</p>
                      <p className="text-[11px] text-muted-foreground font-body">
                        {format(new Date(f.data_inicio), 'dd/MM/yyyy')} — {format(new Date(f.data_fim), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-2 py-0.5 rounded-lg text-xs">
                      {f.dias_ferias}d
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
