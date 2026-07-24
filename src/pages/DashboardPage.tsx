// DashboardPage — Modular Executive Dashboard (V26)
import { PageTitle } from "@/components/PageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Users, DollarSign, Calendar, Clock, Sparkles, Building2, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// Modular dashboard components
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MorningBriefing } from "@/components/dashboard/MorningBriefing";
import { WorkforceHealthScore } from "@/components/dashboard/WorkforceHealthScore";
import { QuickActionsGrid } from "@/components/dashboard/QuickActionsGrid";
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection";
import { KPICardSkeleton } from "@/components/ui/module-skeleton";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";
import { formatCompetenciaLocal } from '@/utils/dateLocal';
import { HealthTrendCard } from "@/components/admin/HealthTrendCard";

/* ─── Data Hooks ─── */
interface DashboardStats {
  colaboradoresAtivos: number;
  folhaMensal: number;
  feriasPendentes: number;
  bancoHoras: number;
  turnover: number;
  absenteismo: number;
  headcount: number;
  admissoesMes: number;
  demissoesMes: number;
  departamentos: { nome: string; count: number }[];
  passivoTotal: number;
}

interface Pendencia {
  tipo: string;
  descricao: string;
  quantidade: number;
  icone: 'ferias' | 'afastamentos' | 'admissoes' | 'assinaturas' | 'ponto' | 'documentos';
}

function useDashboardStats(enabled: boolean) {
  const { empresaAtualId } = useRealtimeDashboard();
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", empresaAtualId],
    enabled: enabled && !!empresaAtualId,
    queryFn: async () => {
      if (!empresaAtualId) throw new Error("Empresa não selecionada");

      const now = new Date();
      const mesAtual = formatCompetenciaLocal(now);
      const em30Dias = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const inicioMes = `${mesAtual}-01`;

      // Executing queries in parallel but with optimized selection
      const [
        { count: colaboradoresAtivos },
        { data: folhaData },
        { count: feriasPendentes },
        { data: bancoData },
        { count: admissoesMes },
        { count: demissoesMes },
        { data: deptData },
        { data: turnoverData },
        { data: absenteismoData },
        { data: colabsAll },
        { data: feriasAll },
      ] = await Promise.all([
        supabase.from("colaboradores").select("id", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("folhas_pagamento").select("total_liquido").eq("competencia", mesAtual),
        supabase.from("ferias").select("id", { count: "exact", head: true }).eq("status", "aprovado").gte("data_inicio", now.toISOString()).lte("data_inicio", em30Dias),
        supabase.from("banco_horas").select("horas, tipo"),
        supabase.from("admissoes").select("id", { count: "exact", head: true }).gte("data_prevista", inicioMes),
        supabase.from("desligamentos").select("id", { count: "exact", head: true }).gte("data_desligamento", inicioMes),
        supabase.from("colaboradores").select("departamento").eq("status", "ativo"),
        supabase.from("vw_kpi_turnover" as any).select("taxa_turnover").limit(1),
        supabase.from("vw_kpi_absenteismo" as any).select("taxa_absenteismo").limit(1),
        supabase.from("colaboradores").select("id, salario_base, data_admissao").eq("status", "ativo"),
        supabase.from("ferias").select("colaborador_id, data_fim").neq("status", "cancelado"),
      ]);

      const folhaMensal = folhaData?.reduce((acc, f) => acc + (f.total_liquido || 0), 0) || 0;
      const bancoHoras = bancoData?.reduce((acc, b) => {
        const [h, m] = (b.horas || "00:00").split(":").map(Number);
        const mins = (h || 0) * 60 + (m || 0);
        return acc + (b.tipo === "credito" ? mins : -mins);
      }, 0) || 0;

      const deptMap: Record<string, number> = {};
      deptData?.forEach(c => { 
        const dept = c.departamento || "Sem Depto";
        deptMap[dept] = (deptMap[dept] || 0) + 1; 
      });
      const departamentos = Object.entries(deptMap)
        .map(([nome, count]) => ({ nome, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      const turnoverVal = (turnoverData as any)?.[0]?.taxa_turnover ?? ((demissoesMes || 0) / (colaboradoresAtivos || 1)) * 100;
      const absenteismoVal = (absenteismoData as any)?.[0]?.taxa_absenteismo ?? 0;

      // Passivo Total Estimation (Simplified from PassivoTrabalhistaPage)
      let passivoTotal = 0;
      if (colabsAll) {
        colabsAll.forEach(c => {
          const salario = Number(c.salario_base || 0);
          if (salario === 0) return;
          
          // 13th pro-rata
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const admissionDate = new Date(c.data_admissao);
          const calcStart = admissionDate > startOfYear ? admissionDate : startOfYear;
          const months = now.getMonth() - calcStart.getMonth() + (12 * (now.getFullYear() - calcStart.getFullYear())) + 1;
          passivoTotal += (salario / 12) * Math.min(months, 12);

          // Vacation pro-rata estimation
          const employeeFerias = feriasAll?.filter(f => f.colaborador_id === c.id) || [];
          const lastFeriasEnd = employeeFerias.length > 0 
            ? new Date(Math.max(...employeeFerias.map(f => new Date(f.data_fim).getTime())))
            : admissionDate;
          const diffMs = now.getTime() - lastFeriasEnd.getTime();
          const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          const accruedDays = Math.floor(diffDays / 30) * 2.5;
          passivoTotal += ((salario / 30) * accruedDays) * 1.3333; // vacations + 1/3
        });
        passivoTotal *= 1.358; // + average charges (INSS Patronal + FGTS + RAT + S)
      }

      return {
        colaboradoresAtivos: colaboradoresAtivos || 0,
        folhaMensal,
        feriasPendentes: feriasPendentes || 0,
        bancoHoras: Math.round(bancoHoras / 60),
        turnover: Number(turnoverVal),
        absenteismo: Number(absenteismoVal),
        headcount: colaboradoresAtivos || 0,
        admissoesMes: admissoesMes || 0,
        demissoesMes: demissoesMes || 0,
        departamentos,
        passivoTotal,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

function usePendencias(enabled: boolean) {
  return useQuery<Pendencia[]>({
    queryKey: ["dashboard-pendencias"],
    enabled,
    queryFn: async () => {
      const [
        { count: feriasPendentes },
        { count: afastamentosAtivos },
        { count: admissoesPendentes },
        { count: assinaturasPendentes },
        { count: pontoPendente },
      ] = await Promise.all([
        supabase.from("ferias").select("*", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("afastamentos").select("*", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("admissoes").select("*", { count: "exact", head: true }).filter('etapa', 'not.in', '("concluida","cancelada")'),
        supabase.from("assinaturas_digitais" as any).select("*", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("solicitacoes_ajuste_ponto" as any).select("*", { count: "exact", head: true }).eq("status", "pendente"),
      ]);
      const pendencias: Pendencia[] = [];
      if (feriasPendentes && feriasPendentes > 0) pendencias.push({ tipo: "ferias", descricao: `${feriasPendentes} férias pendentes`, quantidade: feriasPendentes, icone: 'ferias' });
      if (afastamentosAtivos && afastamentosAtivos > 0) pendencias.push({ tipo: "afastamentos", descricao: `${afastamentosAtivos} afastamentos ativos`, quantidade: afastamentosAtivos, icone: 'afastamentos' });
      if (admissoesPendentes && admissoesPendentes > 0) pendencias.push({ tipo: "admissoes", descricao: `${admissoesPendentes} admissões em curso`, quantidade: admissoesPendentes, icone: 'admissoes' });
      if (assinaturasPendentes && assinaturasPendentes > 0) pendencias.push({ tipo: "assinaturas", descricao: `${assinaturasPendentes} assinaturas pendentes`, quantidade: assinaturasPendentes, icone: 'assinaturas' });
      if (pontoPendente && pontoPendente > 0) pendencias.push({ tipo: "ponto", descricao: `${pontoPendente} ajustes de ponto`, quantidade: pontoPendente, icone: 'ponto' });
      
      return pendencias;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

const emptySparkline = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

/* ─── Onboarding Wizard ─── */
function OnboardingWizard() {
  const navigate = useNavigate();
  const steps = [
    { step: 1, title: 'Cadastrar Empresa', desc: 'Configure os dados da sua empresa', icon: Building2, path: '/empresas/nova', gradient: 'from-primary to-primary-glow' },
    { step: 2, title: 'Adicionar Colaboradores', desc: 'Cadastre seus primeiros funcionários', icon: UserPlus, path: '/colaboradores/novo', gradient: 'from-primary/80 to-primary' },
    { step: 3, title: 'Processar Folha', desc: 'Execute o primeiro cálculo de folha', icon: DollarSign, path: '/folha', gradient: 'from-primary/60 to-primary/90' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-full">
      <Card className="border border-dashed border-border/50 bg-gradient-to-br from-card to-accent/20 rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <CardContent className="relative p-section md:p-8 lg:p-12">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5, delay: 0.4 }}
              className="inline-flex p-5 rounded-3xl bg-gradient-to-br from-primary/10 to-info/10 mb-6">
              <Sparkles className="h-10 w-10 text-primary" />
            </motion.div>
            <h2 className="text-display font-display font-bold mb-2">Bem-vindo ao Sistema DP!</h2>
            <p className="text-body text-muted-foreground font-body max-w-md mx-auto">
              Siga os 3 passos abaixo para configurar seu departamento pessoal
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {steps.map((s, i) => (
              <motion.button key={s.step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.15 }} whileHover={{ scale: 1.03, y: -4 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate(s.path)}
                className="relative flex flex-col items-center text-center p-6 rounded-2xl glass border border-border/30 hover:border-primary/40 hover:shadow-glow transition-all group">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={cn("inline-flex items-center justify-center h-6 w-6 rounded-full text-overline font-bold bg-gradient-to-br text-primary-foreground shadow-lg", s.gradient)}>
                    {s.step}
                  </span>
                </div>
                <div className={cn("p-4 rounded-2xl bg-gradient-to-br mb-4 shadow-lg group-hover:scale-110 transition-transform", s.gradient)}>
                  <s.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-h3 font-display font-semibold mb-1">{s.title}</h3>
                <p className="text-caption text-muted-foreground font-body">{s.desc}</p>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Main Dashboard ─── */
export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { empresaAtualId } = useRealtimeDashboard();
  const isAuthenticated = !!user;
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useDashboardStats(isAuthenticated);
  const { data: pendencias, isLoading: loadingPendencias } = usePendencias(isAuthenticated);

  const hoje = new Date();
  const greeting = hoje.getHours() < 12 ? "Bom dia" : hoje.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const isEmptySystem = !loadingStats && stats?.colaboradoresAtivos === 0 && stats?.folhaMensal === 0;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <DashboardHeader greeting={greeting} isLoading={loadingStats} onRefresh={() => refetchStats()} />

      {/* 2. KPIs Primários — métricas críticas no topo */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {loadingStats ? (
          Array(4).fill(0).map((_, i) => <KPICardSkeleton key={i} index={i} />)
        ) : (
          <>
            <MetricCard title="Colaboradores Ativos" value={stats?.colaboradoresAtivos || 0} rawValue={stats?.colaboradoresAtivos || 0}
              icon={Users} trend={stats?.colaboradoresAtivos ? { value: 2.5, label: "vs mês anterior" } : undefined}
              gradient="from-primary to-primary-glow" sparkline={emptySparkline} index={0} />
            <MetricCard title="Folha Mensal" value={formatCurrency(stats?.folhaMensal || 0)} rawValue={stats?.folhaMensal || 0}
              icon={DollarSign} trend={stats?.folhaMensal ? { value: -1.2, label: "vs mês anterior" } : undefined}
              gradient="from-primary/80 to-primary" sparkline={emptySparkline} index={1}
              formatFn={formatCurrency} />
            <MetricCard title="Férias Pendentes" value={stats?.feriasPendentes || 0} rawValue={stats?.feriasPendentes || 0}
              icon={Calendar} description="Próximos 30 dias"
              gradient="from-primary/60 to-primary/90" sparkline={emptySparkline} index={2} />
            <MetricCard title="Banco de Horas" value={`${stats?.bancoHoras && stats.bancoHoras > 0 ? "+" : ""}${stats?.bancoHoras || 0}h`}
              icon={Clock} description="Saldo total"
              gradient="from-primary-glow to-primary" sparkline={emptySparkline} index={3} />
          </>
        )}
      </div>

      {/* 3. Painel de Comando + Saúde Organizacional */}
      {!isEmptySystem && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <MorningBriefing />
          </div>
          <div className="lg:col-span-2">
            <WorkforceHealthScore
              turnover={stats?.turnover || 0}
              absenteismo={stats?.absenteismo || 0}
              cadastrosCompletos={stats?.colaboradoresAtivos || 0}
              totalColaboradores={stats?.colaboradoresAtivos || 0}
              feriasPendentes={stats?.feriasPendentes || 0}
              passivoTotal={stats?.passivoTotal || 0}
            />
          </div>
        </div>
      )}

      {/* 4. Onboarding (sistema vazio) */}
      {isEmptySystem && <OnboardingWizard />}

      {/* 5. Ações Rápidas — 6 cols compact */}
      <QuickActionsGrid />

      {/* 6. Analytics — Seções temáticas */}
      <AnalyticsSection
        stats={stats}
        pendencias={pendencias}
        isLoadingStats={loadingStats}
        isLoadingPendencias={loadingPendencias}
        isEmptySystem={isEmptySystem}
        empresaId={empresaAtualId || undefined}
      />

      {/* 7. Observabilidade pós-cutover — admin only */}
      {isAdmin && <HealthTrendCard />}
    </div>
  );
}
