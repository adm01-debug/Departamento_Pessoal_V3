import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, Users, PieChart as PieIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  competenciaAnterior,
  competenciaParaBanco,
  criarDadosComposicao,
  criarDadosTendencia,
  type FolhaDashboardResumo,
  type FolhaHistoricoRow,
} from './folhaDashboardData';

interface FolhaDashboardProps {
  competencia: string;
  empresaId?: string;
  resumo?: FolhaDashboardResumo;
}

export function FolhaDashboard({ competencia, empresaId, resumo }: FolhaDashboardProps) {
  const competenciaBanco = competenciaParaBanco(competencia);
  const competenciaInicial = competenciaAnterior(competencia, 5);
  const { data: trendData = [], isLoading: isLoadingTrend } = useQuery({
    queryKey: ['folha-dashboard-tendencia', empresaId, competenciaBanco],
    enabled: Boolean(empresaId && competenciaBanco && competenciaInicial),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folhas_pagamento')
        .select('competencia, total_proventos, total_colaboradores')
        .eq('empresa_id', empresaId!)
        .eq('tipo', 'mensal')
        .gte('competencia', competenciaInicial!)
        .lte('competencia', competenciaBanco!)
        .order('competencia', { ascending: true })
        .limit(6);
      if (error) throw error;
      return criarDadosTendencia((data ?? []) as FolhaHistoricoRow[]);
    },
    staleTime: 2 * 60 * 1000,
  });
  const compositionData = criarDadosComposicao(resumo);
  const hasTrend = trendData.length > 0;
  const hasComposition = compositionData.length > 0;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border/40 shadow-xs rounded-2xl h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Tendência de Proventos
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[220px]">
            {hasTrend ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '11px',
                    }}
                    formatter={(value: unknown) => [
                      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0)),
                      'Proventos',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                {isLoadingTrend ? 'Carregando histórico…' : 'Sem histórico para a empresa selecionada.'}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-border/40 shadow-xs rounded-2xl h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Users className="h-4 w-4 text-info" /> Headcount vs Proventos Médios
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[220px]">
            {hasTrend ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '11px',
                    }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="colaboradores"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="proventosMedios"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                {isLoadingTrend ? 'Carregando histórico…' : 'Sem histórico para a empresa selecionada.'}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-border/40 shadow-xs rounded-2xl h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-success" /> Composição de Custos
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[220px]">
            {hasComposition ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={compositionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {compositionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '11px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                Sem valores calculados para esta competência.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
