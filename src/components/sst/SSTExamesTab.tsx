import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const CHART_COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--info))', 'hsl(var(--primary))'];

interface SSTExamesTabProps {
  asos: any[];
  porTipo: { name: string; value: number }[];
  porDepartamento: { name: string; value: number }[];
  isLoading: boolean;
}

export function SSTExamesTab({ asos, porTipo, porDepartamento, isLoading }: SSTExamesTabProps) {
  const hoje = new Date();
  const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card className="border-border/30 rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-display">ASOs por Tipo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={porTipo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(p: any) => `${p.name} ${((p.percent ?? 0) * 100).toFixed(0)}%`}>
                  {porTipo.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border/30 rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-display">ASOs por Departamento</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porDepartamento.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {isLoading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> : (
        <Card className="rounded-2xl border-border/30 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-display">Colaborador</TableHead>
                <TableHead className="font-display">Tipo</TableHead>
                <TableHead className="font-display">Data Exame</TableHead>
                <TableHead className="font-display">Validade</TableHead>
                <TableHead className="font-display">Status</TableHead>
                <TableHead className="font-display">Médico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asos.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8 font-body">Nenhum ASO cadastrado</TableCell></TableRow>
              ) : asos.slice(0, 50).map((aso: any) => {
                const vencido = aso.data_validade && new Date(aso.data_validade) < hoje;
                const vencendoBreve = aso.data_validade && !vencido && new Date(aso.data_validade) <= em30dias;
                return (
                  <TableRow key={aso.id} className="hover:bg-accent/30 transition-colors">
                    <TableCell className="font-body font-medium">{aso.colaborador?.nome_completo || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="font-body text-xs">{aso.tipo}</Badge></TableCell>
                    <TableCell className="text-sm font-body">{aso.data_exame ? new Date(aso.data_exame).toLocaleDateString('pt-BR') : '—'}</TableCell>
                    <TableCell className="text-sm font-body">{aso.data_validade ? new Date(aso.data_validade).toLocaleDateString('pt-BR') : '—'}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-0 font-body", vencido ? 'bg-destructive/15 text-destructive' : vencendoBreve ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success')}>
                        {vencido ? 'Vencido' : vencendoBreve ? 'Vencendo' : 'Válido'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-body">{aso.medico_nome || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
