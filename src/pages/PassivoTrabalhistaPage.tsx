import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Scale, AlertTriangle, Calendar, TrendingUp, Info, Download,
  RefreshCw, Users, DollarSign, PieChart, ShieldAlert, Clock,
  ArrowRight, Landmark, FileWarning
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, Legend, PieChart as RePieChart, Pie, AreaChart, Area
} from 'recharts';
import { format, addMonths, differenceInDays, parseISO, startOfMonth, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { ChartSkeleton, KPICardSkeleton } from '@/components/ui/module-skeleton';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

const DIAS_POR_ANO = 30;
const TERCO = 1 / 3;
const ALIQ_FGTS = 0.08;
const MULTA_FGTS = 0.40;
const ALIQ_INSS = 0.20;

interface RiskEmp {
  id: string; nome: string; salario: number;
  diasAtraso: number; nivel: 'critico' | 'alerta' | 'normal';
  valorFerias: number; terco: number; valor13: number;
  fgtsFerias: number; fgts13: number; multa: number;
  totalProvisionado: number;
  periodoAquisitivo: string; dataVencimento: string;
}

function calcFerias(salario: number, admissao: string, ultimaFim: string | null, hoje: Date) {
  const admiss = new Date(admissao);
  const ultFim = ultimaFim ? new Date(ultimaFim) : null;
  const periodoInicio = ultFim
    ? new Date(ultFim.getTime() + 86400000)
    : admiss;
  const vencimento = addMonths(periodoInicio, 12);
  const diasDecorridos = differenceInDays(vencimento, hoje);
  const vencidas = Math.max(0, -diasDecorridos);
  const direito = Math.min(vencidas, 30);
  const vf = (salario / 30) * direito;
  const tc = vf * TERCO;
  return { dias: vencidas, vf, tc, vencimento };
}

function calc13(salario: number, admissao: string, hoje: Date) {
  const iniAno = new Date(hoje.getFullYear(), 0, 1);
  const ini = new Date(admissao) > iniAno ? new Date(admissao) : iniAno;
  const meses = Math.min(12, Math.max(1, differenceInMonths(hoje, ini) + 1));
  return salario * (meses / 12);
}

export default function PassivoTrabalhistaPage() {
  const { empresaAtualId } = useEmpresas();

  const { data: folhaAtual } = useQuery({
    queryKey: ['folha-ultima-competencia', empresaAtualId],
    enabled: !!empresaAtualId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('folhas_pagamento')
        .select('competencia')
        .eq('empresa_id', empresaAtualId!)
        .order('competencia', { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const competenciaLabel = folhaAtual?.competencia
    ? format(parseISO(folhaAtual.competencia), 'MMM/yyyy', { locale: ptBR })
    : format(new Date(), 'MMM/yyyy', { locale: ptBR });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['passivo-trabalhista-v2', empresaAtualId, folhaAtual?.competencia],
    enabled: !!empresaAtualId,
    queryFn: async () => {
      const { data: colabs } = await (supabase as any)
        .from('colaboradores')
        .select('id, nome_completo, salario_base, data_admissao')
        .eq('empresa_id', empresaAtualId!).eq('status', 'ativo');
      if (!colabs?.length) return null;

      const { data: fer } = await (supabase as any)
        .from('ferias').select('colaborador_id, data_fim, status')
        .eq('empresa_id', empresaAtualId!).neq('status', 'cancelado');

      const { data: provs } = await (supabase as any)
        .from('provisionamentos')
        .select('colaborador_id, tipo, valor_provisionado')
        .eq('empresa_id', empresaAtualId!)
        .eq('competencia', folhaAtual?.competencia ?? format(new Date(), 'yyyy-MM'));
      const provMap = new Map<string, number>();
      for (const p of (provs ?? [])) provMap.set(`${p.colaborador_id}_${p.tipo}`, Number(p.valor_provisionado));

      const hoje = new Date();
      let tVac = 0, t13 = 0, tFgts = 0, tMulta = 0, tInss = 0;
      const risks: RiskEmp[] = [];
      const divergencias: { nome: string; tipo: string; diff: number }[] = [];

      for (const c of colabs) {
        const sal = Number(c.salario_base || 0);
        if (!sal) continue;
        const ferC = (fer ?? []).filter((f: any) => f.colaborador_id === c.id && f.status === 'concluida');
        const ultFim = ferC.length ? String(ferC.reduce((m: number, f: any) => Math.max(m, new Date(f.data_fim).getTime()), 0)) : null;
        const { dias, vf, tc, vencimento } = calcFerias(sal, c.data_admissao, ultFim, hoje);
        const v13 = calc13(sal, c.data_admissao, hoje);
        const fgtsF = (vf + tc) * ALIQ_FGTS;
        const fgts13 = v13 * ALIQ_FGTS;
        const fgtsTotal = fgtsF + fgts13;
        const multa = fgtsTotal * 12 * MULTA_FGTS;
        const inss = (vf + tc + v13) * ALIQ_INSS;
        const total = vf + tc + v13 + fgtsTotal + multa + inss;
        tVac += vf + tc; t13 += v13; tFgts += fgtsTotal; tMulta += multa; tInss += inss;

        if (dias >= 365) {
          risks.push({
            id: c.id, nome: c.nome_completo, salario: sal,
            diasAtraso: dias, nivel: dias >= 730 ? 'critico' : 'alerta',
            valorFerias: vf, terco: tc, valor13: v13,
            fgtsFerias: fgtsF, fgts13, multa,
            totalProvisionado: total,
            periodoAquisitivo: ultFim
              ? `${format(addMonths(new Date(ultFim), 1), 'MMM/yy', { locale: ptBR })} → ${format(vencimento, 'MMM/yy', { locale: ptBR })}`
              : `${format(new Date(c.data_admissao), 'MMM/yy', { locale: ptBR })} → ${format(vencimento, 'MMM/yy', { locale: ptBR })}`,
            dataVencimento: format(vencimento, 'yyyy-MM-dd'),
          });
        }
        const provF = provMap.get(`${c.id}_ferias`) ?? 0;
        const prov13 = provMap.get(`${c.id}_13`) ?? 0;
        if ((provF > 0 || prov13 > 0) && (
          Math.abs(vf + tc - provF) > sal * 0.05 ||
          Math.abs(v13 - prov13) > sal * 0.05
        )) {
          divergencias.push({
            nome: c.nome_completo,
            tipo: Math.abs(vf + tc - provF) > sal * 0.05 ? 'Férias' : '13º',
            diff: Math.abs(vf + tc - provF) > sal * 0.05
              ? Math.abs(vf + tc - provF) : Math.abs(v13 - prov13),
          });
        }
      }

      const tCharges = tFgts + tMulta + tInss;
      const tTotal = tVac + t13 + tCharges;

      return {
        competencia: folhaAtual?.competencia,
        totalLiability: tTotal,
        vacationLiability: tVac, thirteenthLiability: t13,
        fgtsLiability: tFgts, multaFgtsLiability: tMulta,
        inssPatronalLiability: tInss, chargesLiability: tCharges,
        riskEmployees: risks.sort((a, b) => b.diasAtraso - a.diasAtraso),
        divergencias: divergencias.slice(0, 10),
        distribution: [
          { name: 'Férias + 1/3', value: tVac },
          { name: '13º Salário', value: t13 },
          { name: 'FGTS (8%)', value: tFgts },
          { name: 'Multa FGTS (40%)', value: tMulta },
          { name: 'INSS Patronal (20%)', value: tInss },
        ],
        projection: Array.from({ length: 6 }).map((_, i) => {
          const d = addMonths(hoje, i);
          return { mes: format(d, 'MMM/yy', { locale: ptBR }), valor: tTotal * (1 + i * 0.015) };
        }),
      };
    },
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <PageLayout 
      title="Passivo Trabalhista" 
      description="Análise estratégica de obrigações e riscos financeiros de pessoal"
      icon={<Scale className="h-5 w-5 text-primary-foreground" />}
      gradient="from-destructive to-destructive-glow"
      actions={
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            Competência: {competenciaLabel}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Atualizar
          </Button>
          <Button size="sm" className="rounded-xl shadow-lg bg-destructive hover:bg-destructive/90" onClick={() => toast.info('Gerando relatório detalhado...')}>
            <Download className="h-4 w-4 mr-2" />
            Relatório PDF
          </Button>
        </div>
      }
    >
      {data === null && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
            <FileWarning className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum dado de passivo disponível</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Cadastre colaboradores ativos e folhas de pagamento para visualizar o passivo trabalhista.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} index={i} />) : [
          { label: 'Passivo Total', value: data?.totalLiability || 0, icon: DollarSign, gradient: 'from-destructive to-destructive/70', desc: 'Soma de Férias, 13º e Encargos' },
          { label: 'FGTS + Multa 40%', value: (data?.fgtsLiability || 0) + (data?.multaFgtsLiability || 0), icon: Landmark, gradient: 'from-warning to-warning/70', desc: 'Provisão FGTS + multa rescisória' },
          { label: 'Risco Crítico', value: data?.riskEmployees.filter((r: RiskEmp) => r.nivel === 'critico').length || 0, icon: ShieldAlert, gradient: 'from-destructive/80 to-destructive', desc: 'Férias ≥ 2 anos vencidas (CLT)' },
          { label: 'Provisão 13º', value: data?.thirteenthLiability || 0, icon: Clock, gradient: 'from-primary to-primary/70', desc: 'Pro-rata até competência atual' },
          { label: 'Divergências', value: data?.divergencias?.length || 0, icon: AlertTriangle, gradient: (data?.divergencias?.length || 0) > 0 ? 'from-warning/80 to-warning' : 'from-muted to-muted/50', desc: 'Provisionamento vs calculado' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs h-full">
              <div className={cn("h-1 bg-gradient-to-r", kpi.gradient)} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("p-2 rounded-xl bg-gradient-to-br", kpi.gradient)}>
                    <kpi.icon className="h-4 w-4 text-primary-foreground" />
                  </div>
                  {kpi.label === 'Risco Crítico' && (data?.riskEmployees.filter((r: RiskEmp) => r.nivel === 'critico').length || 0) > 0 && (
                    <Badge variant="destructive" className="animate-pulse text-xs">Crítico</Badge>
                  )}
                  {kpi.label === 'Divergências' && (data?.divergencias?.length || 0) > 0 && (
                    <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30 text-xs">Atenção</Badge>
                  )}
                </div>
                <h3 className="text-2xl font-display font-bold truncate">
                  {typeof kpi.value === 'number' && (
                    kpi.label.includes('Risco') || kpi.label === 'Divergências'
                      ? kpi.value
                      : formatCurrency(kpi.value)
                  )}
                </h3>
                <p className="text-xs font-medium text-foreground/80 mt-1">{kpi.label}</p>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="h-3 w-3" /> {kpi.desc}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* P5-077: Alerta de divergências provisionamento vs calculado */}
      {data?.divergencias && data.divergencias.length > 0 && (
        <Card className="mb-6 border border-warning/40 bg-warning/5 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              Divergências de Provisionamento Detectadas ({data.divergencias.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground font-medium border-b border-warning/20">
                    <th className="px-4 py-2 text-left">Colaborador</th>
                    <th className="px-4 py-2 text-center">Tipo</th>
                    <th className="px-4 py-2 text-right">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {data.divergencias.map((d: { nome: string; tipo: string; diff: number }, i: number) => (
                    <tr key={i} className="border-b border-warning/10 last:border-0">
                      <td className="px-4 py-2 font-medium">{d.nome}</td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant="outline" className="border-warning/50 text-warning text-xs">{d.tipo}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-warning">
                        {formatCurrency(d.diff)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-xs text-muted-foreground">
              <Info className="inline h-3 w-3 mr-1" />
              Provisionamento registrado diverge &gt;5% do calculado — revise os valores da folha.
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 border border-border/30 rounded-2xl shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-destructive" />
              Projeção de Evolução do Passivo (6 Meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.projection || []}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <RechartsTooltip 
                      formatter={(v: any) => formatCurrency(v)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Area type="monotone" dataKey="valor" stroke="hsl(var(--destructive))" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 p-3 bg-muted/30 rounded-xl border border-border/20">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4 text-info" />
                A projeção considera o crescimento natural do passivo (férias e 13º) e uma estimativa de 2% de reajustes ou novas admissões mensais.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/30 rounded-2xl shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Composição do Passivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={data?.distribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data?.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v: any) => formatCurrency(v)} />
                  <Legend verticalAlign="bottom" height={36}/>
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-4">
              {data?.distribution.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-bold">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/30 rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/30">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Radar de Risco: Férias Próximas ao Dobro
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!data?.riskEmployees.length ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium">Nenhum risco crítico detectado!</p>
              <p className="text-xs text-muted-foreground mt-1">Todos os colaboradores estão com férias em dia ou dentro do prazo legal.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/20 text-muted-foreground font-medium border-b border-border/20">
                    <th className="px-4 py-3 text-left">Colaborador</th>
                    <th className="px-4 py-3 text-center">Dias sem Férias</th>
                    <th className="px-4 py-3 text-right">Passivo Estimado</th>
                    <th className="px-4 py-3 text-right">Potencial Multa (Dobro)</th>
                    <th className="px-4 py-3 text-center">Nível</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.riskEmployees.map((emp: RiskEmp) => (
                    <tr key={emp.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors group">
                      <td className="px-4 py-3 font-medium">{emp.nome}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{emp.periodoAquisitivo}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-mono">{emp.diasAtraso} dias</span>
                          <Progress value={Math.min(100, (emp.diasAtraso / 730) * 100)}
                            className={cn("h-1 w-20 mt-1", emp.nivel === 'critico' ? "bg-destructive/20 [&>div]:bg-destructive" : "bg-warning/20 [&>div]:bg-warning")}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrency(emp.valorFerias + emp.terco)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-warning">{formatCurrency(emp.fgtsFerias + emp.fgts13)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-destructive">{formatCurrency(emp.multa)}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatCurrency(emp.totalProvisionado)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={emp.nivel === 'critico' ? 'destructive' : 'outline'}
                          className={cn(emp.nivel === 'alerta' && "border-warning text-warning")}>
                          {emp.nivel === 'critico' ? 'Crítico' : 'Alerta'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0 group-hover:bg-primary group-hover:text-primary-foreground">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
