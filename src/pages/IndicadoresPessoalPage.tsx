import { useMemo, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { KPICardSkeleton, ChartSkeleton } from '@/components/ui/module-skeleton';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useIndicadoresPessoal } from '@/hooks/useIndicadoresPessoal';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Clock,
  RefreshCw,
  TrendingDown,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Janela = '30' | '90' | '180' | '365';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
};

function formatarDataHora(valor?: string | null) {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function IndicadoresPessoalPage() {
  const { empresaAtualId } = useEmpresas();
  const [janela, setJanela] = useState<Janela>('90');
  const { data, isLoading, isFetching, isError, error, refetch } = useIndicadoresPessoal(
    empresaAtualId ?? undefined,
    Number(janela),
    12
  );

  const serie = data?.turnover_mensal ?? [];
  const ultimoMes = serie.length > 0 ? serie[serie.length - 1] : undefined;
  const mesAnterior = serie.length > 1 ? serie[serie.length - 2] : undefined;

  const variacaoEfetivo =
    ultimoMes && mesAnterior && mesAnterior.efetivo_fim > 0
      ? ((ultimoMes.efetivo_fim - mesAnterior.efetivo_fim) / mesAnterior.efetivo_fim) * 100
      : undefined;

  const afastamentos = data?.absenteismo ?? [];
  const ferias = data?.ferias_resumo;
  const departamentos = data?.cadastros_por_departamento ?? [];
  const topFerias = (data?.ferias_saldo ?? []).slice(0, 10);

  const totalAfastamentos = afastamentos.reduce((soma, item) => soma + item.total, 0);
  const diasAfastamento = afastamentos.reduce((soma, item) => soma + (item.dias_totais ?? 0), 0);

  const afastamentosPorTipo = useMemo(() => {
    const mapa = new Map<string, { tipo: string; total: number; dias: number }>();
    (data?.absenteismo ?? []).forEach((item) => {
      const atual = mapa.get(item.tipo) ?? { tipo: item.tipo, total: 0, dias: 0 };
      atual.total += item.total;
      atual.dias += item.dias_totais ?? 0;
      mapa.set(item.tipo, atual);
    });
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [data?.absenteismo]);

  const maiorDepartamento = departamentos.reduce((maior, item) => Math.max(maior, item.total), 0);
  const ultimaAtualizacao = formatarDataHora(data?.atualizacao?.ultima_execucao);

  const kpis = [
    {
      label: 'Efetivo (último mês)',
      value: ultimoMes ? String(ultimoMes.efetivo_fim) : '—',
      detalhe: ultimoMes ? `Competência ${ultimoMes.mes}` : 'Sem série mensal',
      icon: Users,
      gradient: 'from-primary to-primary-glow',
      delta: variacaoEfetivo,
      alert: false,
    },
    {
      label: 'Turnover do mês',
      value: ultimoMes?.turnover_pct != null ? `${Number(ultimoMes.turnover_pct).toFixed(1)}%` : '—',
      detalhe: ultimoMes
        ? `${ultimoMes.admissoes} admissões / ${ultimoMes.desligamentos} desligamentos`
        : 'Sem série mensal',
      icon: TrendingDown,
      gradient: 'from-destructive to-destructive/70',
      delta: undefined,
      alert: (ultimoMes?.turnover_pct ?? 0) > 10,
    },
    {
      label: 'Férias acima de 30 dias',
      value: ferias ? String(ferias.acima_30_dias) : '—',
      detalhe: ferias
        ? `${ferias.colaboradores} colaboradores · saldo médio ${Number(ferias.saldo_medio_dias).toFixed(1)} d`
        : 'Sem saldo apurado',
      icon: Calendar,
      gradient: 'from-warning to-warning/70',
      delta: undefined,
      alert: (ferias?.acima_30_dias ?? 0) > 0,
    },
    {
      label: 'Afastamentos (12 meses)',
      value: String(totalAfastamentos),
      detalhe: `${diasAfastamento.toLocaleString('pt-BR')} dias corridos`,
      icon: Clock,
      gradient: 'from-info to-info/70',
      delta: undefined,
      alert: false,
    },
  ];

  const semDados =
    !isLoading &&
    !isError &&
    serie.length === 0 &&
    afastamentos.length === 0 &&
    departamentos.length === 0 &&
    (ferias?.colaboradores ?? 0) === 0;

  return (
    <>
      <PageTitle
        title="Indicadores de Pessoal"
        description="Turnover, movimentação, absenteísmo e férias consolidados no banco"
      />
      <PageLayout
        title="Indicadores de Pessoal"
        description="Consolidado das views de indicadores — atualizado pelo refresh diário"
        icon={<Activity className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
        actions={
          <div className="flex gap-2">
            <Select value={janela} onValueChange={(valor) => setJanela(valor as Janela)}>
              <SelectTrigger className="w-[140px] rounded-xl" aria-label="Janela de análise">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="180">180 dias</SelectItem>
                <SelectItem value="365">365 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-xl"
              aria-label="Atualizar indicadores"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        }
      >
        {isError && (
          <EmptyState
            icon={AlertTriangle}
            title="Não foi possível carregar os indicadores"
            description={error instanceof Error ? error.message : 'Erro ao consultar os indicadores do banco.'}
            action={{ label: 'Tentar novamente', onClick: () => refetch() }}
            className="mb-6"
          />
        )}

        {semDados && (
          <EmptyState
            icon={Activity}
            title="Sem indicadores no período"
            description="As views de indicadores são recalculadas todos os dias às 05:00. Assim que houver movimentação de pessoal no período, os números aparecem aqui."
            className="mb-6"
          />
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
            : kpis.map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border border-border/30 rounded-2xl overflow-hidden h-full">
                    <div className={cn('h-[2px] bg-gradient-to-r', kpi.gradient)} />
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn('p-1.5 rounded-lg bg-gradient-to-br', kpi.gradient)}>
                          <kpi.icon className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                        {kpi.alert && <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-pulse" />}
                      </div>
                      <p className="text-xl font-display font-bold">{kpi.value}</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-muted-foreground font-body">{kpi.label}</p>
                        {kpi.delta !== undefined && (
                          <Badge variant={kpi.delta >= 0 ? 'default' : 'destructive'} className="text-[9px] px-1.5">
                            {kpi.delta >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {Math.abs(kpi.delta).toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">{kpi.detalhe}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border border-border/30 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-display">Efetivo e movimentação</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : serie.length === 0 ? (
                <p className="text-xs text-muted-foreground py-12 text-center">Sem série mensal de movimentação.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={serie}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="pessoas" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="fluxo" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend />
                    <Bar
                      yAxisId="fluxo"
                      dataKey="admissoes"
                      name="Admissões"
                      fill="hsl(var(--success))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="fluxo"
                      dataKey="desligamentos"
                      name="Desligamentos"
                      fill="hsl(var(--destructive))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="pessoas"
                      dataKey="efetivo_fim"
                      name="Efetivo no fim do mês"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/30 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-display">Turnover mensal (%)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : serie.length === 0 ? (
                <p className="text-xs text-muted-foreground py-12 text-center">Sem série mensal de turnover.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={serie}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="turnover_pct" name="Turnover (%)" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/30 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-display">Afastamentos por tipo (12 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : afastamentosPorTipo.length === 0 ? (
                <p className="text-xs text-muted-foreground py-12 text-center">
                  Nenhum afastamento registrado nos últimos 12 meses.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={afastamentosPorTipo} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="tipo" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="total" name="Afastamentos" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/30 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-display">Cadastros por departamento</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : departamentos.length === 0 ? (
                <p className="text-xs text-muted-foreground py-12 text-center">
                  Nenhum cadastro no período selecionado.
                </p>
              ) : (
                <div className="space-y-3" data-testid="departamentos">
                  {departamentos.slice(0, 8).map((item) => (
                    <div key={item.departamento}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-body truncate">{item.departamento}</span>
                        <span className="text-muted-foreground font-display">{item.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
                          style={{
                            width: `${maiorDepartamento > 0 ? (item.total / maiorDepartamento) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[9px] px-1.5">
                          {item.ativos} ativos
                        </Badge>
                        {item.em_ferias > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1.5">
                            {item.em_ferias} férias
                          </Badge>
                        )}
                        {item.afastados > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1.5">
                            {item.afastados} afastados
                          </Badge>
                        )}
                        {item.desligados > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1.5">
                            {item.desligados} desligados
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/30 rounded-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-display">Maiores saldos de férias</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : topFerias.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  Nenhum colaborador ativo com saldo apurado.
                </p>
              ) : (
                <div className="divide-y divide-border/40" data-testid="ferias-lista">
                  {topFerias.map((colaborador) => (
                    <div key={colaborador.colaborador_id} className="flex items-center justify-between py-2 gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-body truncate">{colaborador.nome}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {colaborador.departamento} · {Number(colaborador.anos_trabalhados)} ano(s) de casa ·{' '}
                          {colaborador.gozos_12m} gozo(s) em 12 meses
                        </p>
                      </div>
                      <Badge
                        variant={colaborador.saldo_dias > 30 ? 'destructive' : 'secondary'}
                        className="text-[10px] shrink-0"
                      >
                        {Number(colaborador.saldo_dias).toFixed(0)} dias
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-[11px] text-muted-foreground mt-4" data-testid="atualizacao">
          {ultimaAtualizacao
            ? `Indicadores recalculados em ${ultimaAtualizacao} · agenda ${data?.atualizacao?.agenda ?? 'diária'}`
            : 'Recálculo automático diário às 05:00 (última execução não registrada).'}
        </p>
      </PageLayout>
    </>
  );
}
