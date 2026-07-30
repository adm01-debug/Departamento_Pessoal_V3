import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingDown } from 'lucide-react';

interface TurnoverChartProps {
  desligamentos: any[];
}

export function TurnoverChart({ desligamentos }: TurnoverChartProps) {
  // Group by month (last 12 months)
  const now = new Date();
  const months: { label: string; key: string; sem_justa: number; justa: number; pedido: number; acordo: number; total: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    months.push({ label, key, sem_justa: 0, justa: 0, pedido: 0, acordo: 0, total: 0 });
  }

  desligamentos.forEach((d: any) => {
    if (!d.data_desligamento) return;
    const dt = new Date(d.data_desligamento);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const month = months.find((m) => m.key === key);
    if (!month) return;
    if (d.tipo === 'sem_justa_causa') month.sem_justa++;
    else if (d.tipo === 'com_justa_causa') month.justa++;
    else if (d.tipo === 'pedido_demissao') month.pedido++;
    else month.acordo++;
    month.total++;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="border-border/30 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Turnover Mensal (últimos 12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={months} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                  fontSize: 12}}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="sem_justa" name="Sem Justa Causa" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="justa" name="Justa Causa" stackId="a" fill="hsl(var(--warning))" />
              <Bar dataKey="pedido" name="Ped. Demissão" stackId="a" fill="hsl(var(--info))" />
              <Bar dataKey="acordo" name="Acordo/Outros" stackId="a" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="total" name="Total" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
