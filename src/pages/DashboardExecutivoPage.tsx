import { PageTitle } from '@/components/PageTitle';
import { useRealTimeSubscription } from '@/hooks/useRealTimeSubscription';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KPICardSkeleton, ChartSkeleton } from '@/components/ui/module-skeleton';

import { useEmpresas } from '@/hooks/useEmpresas';
import { useExecutiveKPIs, useStrategicFinancials } from '@/hooks/useExecutiveDashboard';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Users, DollarSign, Calendar, Clock,
  ArrowUpRight, ArrowDownRight, Building2, Target,
  RefreshCw, AlertTriangle, ShieldCheck, Landmark, Wallet,
  Activity, UserPlus
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line } from 'recharts';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnalyticsSection, EventTimeline } from '@/components/dashboard';
import { useNavigate } from 'react-router-dom';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];

export default function DashboardExecutivoPage() {
  const navigate = useNavigate();
  const { empresaAtualId } = useEmpresas();
  const [periodo, setPeriodo] = useState('6');
  const { data, isLoading, refetch } = useExecutiveKPIs(empresaAtualId ?? undefined, periodo);
  const { data: strategic, isLoading: isStrategicLoading } = useStrategicFinancials(empresaAtualId ?? undefined);

  // Subscribe to real-time updates for KPIs
  useRealTimeSubscription('colaboradores', ['executive-kpis', empresaAtualId, periodo], empresaAtualId ?? undefined);
  useRealTimeSubscription('folhas_pagamento', ['executive-kpis', empresaAtualId, periodo], empresaAtualId ?? undefined);
  useRealTimeSubscription('ferias', ['executive-kpis', empresaAtualId, periodo], empresaAtualId ?? undefined);
  useRealTimeSubscription('afastamentos', ['executive-kpis', empresaAtualId, periodo], empresaAtualId ?? undefined);

  const kpis = [
    { label: 'Headcount', value: data?.totalAtivos || 0, icon: Users, gradient: 'from-primary to-primary-glow', format: 'number' },
    { label: 'Folha Mensal', value: data?.totalFolhaAtual || 0, icon: DollarSign, gradient: 'from-success to-success/70', format: 'currency', delta: data?.variacaoFolha },
    { label: 'Custo/Colaborador', value: data?.custoMedio || 0, icon: Target, gradient: 'from-warning to-warning/70', format: 'currency' },
    { label: 'Turnover', value: data?.turnover || 0, icon: TrendingDown, gradient: 'from-destructive to-destructive/70', format: 'percent', alert: (data?.turnover || 0) > 10 },
    { label: 'Absenteísmo', value: data?.absenteismo || 0, icon: Clock, gradient: 'from-info to-info/70', format: 'percent', alert: (data?.absenteismo || 0) > 5 },
    { label: 'Férias Pendentes', value: data?.feriasPendentes || 0, icon: Calendar, gradient: 'from-warning to-warning/70', format: 'number' },
  ];

  const formatValue = (v: number, fmt: string) => {
    if (fmt === 'currency') return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    if (fmt === 'percent') return `${v.toFixed(1)}%`;
    return v.toString();
  };

  return (
    <>
    <PageTitle title="Dashboard Executivo" description="Painel executivo de indicadores" />
    <PageLayout title="Dashboard Executivo" description="Indicadores estratégicos de RH"
      icon={<BarChart3 className="h-5 w-5 text-primary-foreground" />} gradient="from-primary to-primary-glow"
      actions={
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[140px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <KPICardSkeleton key={i} />) :
          kpis.map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden h-full">
                <div className={cn("h-[2px] bg-gradient-to-r", kpi.gradient)} />
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", kpi.gradient)}>
                      <kpi.icon className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    {kpi.alert && <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-pulse" />}
                  </div>
                  <p className="text-xl font-display font-bold">{formatValue(kpi.value, kpi.format)}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground font-body">{kpi.label}</p>
                    {kpi.delta !== undefined && (
                      <Badge variant={kpi.delta >= 0 ? 'default' : 'destructive'} className="text-[9px] px-1.5">
                        {kpi.delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(kpi.delta).toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        }
      </div>

      <Tabs defaultValue="evolucao">
        <TabsList className="mb-4">
          <TabsTrigger value="evolucao"><TrendingUp className="mr-1 h-4 w-4" />Evolução</TabsTrigger>
          <TabsTrigger value="custos"><DollarSign className="mr-1 h-4 w-4" />Custos</TabsTrigger>
          <TabsTrigger value="estrutura"><Building2 className="mr-1 h-4 w-4" />Estrutura</TabsTrigger>
          <TabsTrigger value="estrategia"><ShieldCheck className="mr-1 h-4 w-4" />Estratégia & Orçamento</TabsTrigger>
          <TabsTrigger value="analitico"><Activity className="mr-1 h-4 w-4" />Análise Detalhada</TabsTrigger>
        </TabsList>

        <TabsContent value="evolucao">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-border/30 rounded-2xl">
              <CardHeader><CardTitle className="text-sm font-display">Admissões vs Desligamentos</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <ChartSkeleton /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={data?.evolucao || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                      <Legend />
                      <Bar dataKey="admissoes" name="Admissões" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="demissoes" name="Demissões" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      <Line dataKey="saldo" name="Saldo" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/30 rounded-2xl">
              <CardHeader><CardTitle className="text-sm font-display">Turnover Mensal (%)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data?.evolucao?.map(e => ({ ...e, turnover: data.totalAtivos > 0 ? (e.demissoes / data.totalAtivos * 100).toFixed(1) : 0 })) || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="turnover" name="Turnover %" fill="hsl(var(--destructive) / 0.2)" stroke="hsl(var(--destructive))" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custos">
          <Card className="border border-border/30 rounded-2xl">
            <CardHeader><CardTitle className="text-sm font-display">Evolução de Custos com Pessoal</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={data?.custosMensal || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} formatter={(v: any) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                  <Legend />
                  <Area type="monotone" dataKey="bruto" name="Bruto" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="liquido" name="Líquido" stroke="hsl(var(--success))" strokeWidth={2} />
                  <Bar dataKey="descontos" name="Descontos" fill="hsl(var(--warning) / 0.5)" radius={[2, 2, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estrutura">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-border/30 rounded-2xl">
              <CardHeader><CardTitle className="text-sm font-display">Distribuição por Departamento</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie data={data?.departamentos || []} dataKey="value" nameKey="nome" cx="50%" cy="50%" outerRadius={100} label={(p: any) => `${p.nome} (${p.value})`}>
                      {data?.departamentos?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-border/30 rounded-2xl">
              <CardHeader><CardTitle className="text-sm font-display">Headcount por Departamento</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.departamentos || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="nome" type="category" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Bar dataKey="value" name="Colaboradores" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="estrategia" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personnel Cost Projection */}
            <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Projeção de Fluxo de Caixa (Pessoal)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={strategic?.projections || []}>
                      <defs>
                        <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis dataKey="mes_ref" tickFormatter={(v) => format(new Date(v), 'MMM/yy', { locale: ptBR })} fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={(v) => `R$${v/1000}k`} />
                      <Tooltip 
                        formatter={(v: any) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '12px' }}
                      />
                      <Area type="monotone" dataKey="total_estimado" name="Custo Projetado" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorProj)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-3 bg-info/5 rounded-xl border border-info/10 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-info mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    A projeção considera a média das últimas folhas, provisões de férias/13º acumuladas e encargos patronais (27,8%). Não considera admissões futuras não planejadas.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Budget vs Actual */}
            <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-warning" /> Aderência Orçamentária por Depto.
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.departamentos?.map(d => ({
                      nome: d.nome,
                      actual: Math.round((d.value / (data?.totalAtivos || 1)) * (data?.totalFolhaAtual || 0)),
                      budget: strategic?.budgets?.find(b => b.departamento === d.nome)?.valor_orcado || (data?.totalFolhaAtual || 0) / (data?.departamentos?.length || 1) * 1.1
                    })) || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis dataKey="nome" fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={(v) => `R$${v/1000}k`} />
                      <Tooltip 
                        formatter={(v: any) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '12px' }}
                      />
                      <Legend verticalAlign="top" height={36}/>
                      <Bar dataKey="budget" name="Orçado" fill="hsl(var(--muted-foreground)/0.3)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actual" name="Realizado" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-[10px] text-muted-foreground">Em conformidade</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-destructive" />
                      <span className="text-[10px] text-muted-foreground">Excesso orçamentário</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] text-primary">Ajustar Metas</Button>
                </div>
              </CardContent>
            </Card>

            {/* Strategic Analysis */}
            <Card className="border border-border/30 rounded-2xl bg-slate-900 text-white lg:col-span-2 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <ShieldCheck className="h-32 w-32" />
              </div>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2 text-primary-glow">
                  <Target className="h-5 w-5" /> Plano de Sustentabilidade de Pessoal (PSP)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Score de Risco</h4>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-display font-bold text-success">9.2</span>
                      <span className="text-sm text-slate-400 mb-1">/ 10.0</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Excelente saúde financeira. Custos fixos representam 42% da receita bruta projetada.</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Próximo Milestone</h4>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                        <Wallet className="h-5 w-5 text-primary-glow" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Fechamento 13º Salário</p>
                        <p className="text-[10px] text-slate-400">Impacto previsto: + R$ 128k em Dez/26</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Recomendação Estratégica</h4>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs italic text-slate-300">"Otimizar escalas no Depto Logística para reduzir horas extras em 15%, economizando R$ 12k/mês."</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analitico" className="space-y-6">
          <AnalyticsSection 
            stats={data ? {
              headcount: data.totalAtivos,
              admissoesMes: data.evolucao[data.evolucao.length - 1]?.admissoes || 0,
              demissoesMes: data.evolucao[data.evolucao.length - 1]?.demissoes || 0,
              turnover: data.turnover,
              absenteismo: data.absenteismo,
              departamentos: data.departamentos.map(d => ({ nome: d.nome, count: d.value }))
            } : undefined}
            pendencias={[
              { tipo: 'ferias', icone: 'ferias', quantidade: data?.feriasPendentes || 0, descricao: 'Férias aguardando aprovação' },
              { tipo: 'ponto', icone: 'ponto', quantidade: data?.pontoPendentes || 0, descricao: 'Ajustes de ponto pendentes' },
              { tipo: 'assinaturas', icone: 'assinaturas', quantidade: 0, descricao: 'Documentos para assinar' }
            ]}
            isLoadingStats={isLoading}
            isLoadingPendencias={isLoading}
            isEmptySystem={!data?.totalAtivos}
            empresaId={empresaAtualId ?? undefined}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border border-border/30 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Timeline de Auditoria (Real-time)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EventTimeline empresaId={empresaAtualId ?? undefined} />
              </CardContent>
            </Card>
            <Card className="border border-border/30 rounded-2xl">
               <CardHeader>
                 <CardTitle className="text-sm font-display">Ações Rápidas</CardTitle>
               </CardHeader>
               <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => navigate('/colaboradores/novo')}>
                    <UserPlus className="mr-2 h-4 w-4" /> Novo Colaborador
                  </Button>
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => navigate('/ferias')}>
                    <Calendar className="mr-2 h-4 w-4" /> Gerenciar Férias
                  </Button>
                  <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => navigate('/folha-pagamento')}>
                    <DollarSign className="mr-2 h-4 w-4" /> Folha de Pagamento
                  </Button>
               </CardContent>
            </Card>
          </div>
        </TabsContent>
        </Tabs>
    </PageLayout>
    </>
  );
}
