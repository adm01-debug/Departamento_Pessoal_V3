// DashboardPage — composição em viewport única (referência: preview 1920×1080)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Calendar, Clock, Sparkles, Building2, UserPlus, AlertTriangle, History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabaseBase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// Modular dashboard components
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MorningBriefing, useMorningBriefing } from "@/components/dashboard/MorningBriefing";
import { ResumoOperacionalCard } from "@/components/dashboard/ResumoOperacionalCard";
import { ProximasAtividadesCard } from "@/components/dashboard/ProximasAtividadesCard";
import { QuickActionsMenu } from "@/components/dashboard/QuickActionsMenu";
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection";
import { HeadcountOverviewCard } from "@/components/dashboard/HeadcountOverviewCard";
import { DepartmentsCard } from "@/components/dashboard/DepartmentsCard";
import { SystemStatusCard } from "@/components/dashboard/SystemStatusCard";
import { EventTimeline } from "@/components/dashboard/EventTimeline";
import { KPICardSkeleton } from "@/components/ui/module-skeleton";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useExecutiveKPIs } from "@/hooks/useExecutiveDashboard";
import { formatCompetenciaLocal } from '@/utils/dateLocal';
import { dashboardTooltips } from '@/constants/tooltips';
// MOCK VISUAL — ver src/mocks/dashboardMockData.ts (só ativo em dev + VITE_DASHBOARD_MOCK=true).
import { isDashboardMockEnabled, mockDashboardStats, mockEvolucao, mockPendencias, mockMorningBriefing } from "@/mocks/dashboardMockData";

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

export interface Pendencia {
  tipo: string;
  descricao: string;
  quantidade: number;
  icone: 'ferias' | 'afastamentos' | 'admissoes' | 'assinaturas' | 'ponto' | 'documentos';
}

function useDashboardStats(enabled: boolean) {
  const { empresaAtualId } = useEmpresas();
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
        supabaseBase.from("colaboradores").select("id", { count: "exact", head: true }).eq("empresa_id", empresaAtualId).eq("status", "ativo"),
        supabaseBase.from("folhas_pagamento").select("total_liquido").eq("competencia", mesAtual).eq("empresa_id", empresaAtualId),
        supabaseBase.from("ferias").select("id", { count: "exact", head: true }).eq("empresa_id", empresaAtualId).eq("status", "aprovado").gte("data_inicio", now.toISOString()).lte("data_inicio", em30Dias),
        supabaseBase.from("banco_horas").select("horas, tipo").eq("empresa_id", empresaAtualId),
        supabaseBase.from("admissoes").select("id", { count: "exact", head: true }).eq("empresa_id", empresaAtualId).gte("data_prevista", inicioMes),
        supabaseBase.from("desligamentos").select("id", { count: "exact", head: true }).eq("empresa_id", empresaAtualId).gte("data_desligamento", inicioMes),
        supabaseBase.from("colaboradores").select("departamento").eq("empresa_id", empresaAtualId).eq("status", "ativo"),
        supabaseBase.from("vw_kpi_turnover" as any).select("taxa_turnover").order("mes", { ascending: false }).limit(1),
        supabaseBase.from("vw_kpi_absenteismo" as any).select("mes, total_faltas, dias_faltados, empresa_id").order("mes", { ascending: false }).limit(1),
        supabaseBase.from("colaboradores").select("id, salario_base, data_admissao").eq("empresa_id", empresaAtualId).eq("status", "ativo"),
        supabaseBase.from("ferias").select("colaborador_id, data_fim").eq("empresa_id", empresaAtualId).neq("status", "cancelado"),
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
      // vw_kpi_absenteismo não tem taxa calculada — calcular manualmente
      const ultimoAbsMes = (absenteismoData as any)?.[0];
      const absenteismoVal = ultimoAbsMes
        ? (Number(ultimoAbsMes.dias_faltados || 0) / Math.max((colaboradoresAtivos || 1) * 22, 1)) * 100
        : 0;

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
        passivoTotal};
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false});
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
        supabaseBase.from("ferias").select("*", { count: "exact", head: true }).eq("status", "pendente"),
        supabaseBase.from("afastamentos").select("*", { count: "exact", head: true }).eq("status", "ativo"),
        (supabaseBase.from("admissoes") as any).select("*", { count: "exact", head: true }).or('etapa.neq.concluida,etapa.neq.cancelada'),
        supabaseBase.from("documentos_assinatura").select("*", { count: "exact", head: true }).eq("status", "pendente"),
        supabaseBase.from("solicitacoes_ajuste_ponto" as any).select("*", { count: "exact", head: true }).eq("status", "pendente"),
      ]);
      const pendencias: Pendencia[] = [];
      if (feriasPendentes && feriasPendentes > 0) pendencias.push({ tipo: "ferias", descricao: `${feriasPendentes} férias pendentes`, quantidade: feriasPendentes, icone: 'ferias' });
      if (afastamentosAtivos && afastamentosAtivos > 0) pendencias.push({ tipo: "afastamentos", descricao: `${afastamentosAtivos} afastamentos ativos`, quantidade: afastamentosAtivos, icone: 'afastamentos' });
      if (admissoesPendentes && admissoesPendentes > 0) pendencias.push({ tipo: "admissoes", descricao: `${admissoesPendentes} admissões em curso`, quantidade: admissoesPendentes, icone: 'admissoes' });
      if (assinaturasPendentes && assinaturasPendentes > 0) pendencias.push({ tipo: "assinaturas", descricao: `${assinaturasPendentes} assinaturas pendentes`, quantidade: assinaturasPendentes, icone: 'assinaturas' });
      if (pontoPendente && pontoPendente > 0) pendencias.push({ tipo: "ponto", descricao: `${pontoPendente} ajustes de ponto`, quantidade: pontoPendente, icone: 'ponto' });

      return pendencias;
    },
    staleTime: 5 * 60 * 1000});
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 0, maximumFractionDigits: 0}).format(value);
}

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
        <CardContent className="relative p-6 md:p-8 lg:p-12">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5, delay: 0.4 }}
              className="inline-flex p-5 rounded-3xl bg-gradient-to-br from-primary/10 to-info/10 mb-6">
              <Sparkles className="h-10 w-10 text-primary" />
            </motion.div>
            <h2 className="text-display font-display font-medium mb-2">Bem-vindo ao Sistema DP!</h2>
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
                  {/* Sem `cn()`: combinada com `text-primary-foreground` na mesma
                      chamada, o tailwind-merge derrubava `text-overline`. */}
                  <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-overline font-medium bg-gradient-to-br text-primary-foreground shadow-lg ${s.gradient}`}>
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

/** Card de lista para a faixa inferior — mesmo cabeçalho compacto dos demais. */
function ListCard({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    // Mesma altura fixa de "Resumo Operacional"/"Próximas Atividades" — as 3
    // não podem mais depender da largura da tela para decidir quem é mais
    // alto; o que não couber rola dentro do card (`overflow-y-auto` abaixo).
    <Card className="flex h-[280px] flex-col overflow-hidden border border-border/60 rounded-xl">
      <CardHeader className="p-3 pb-1.5 space-y-0">
        <div className="flex items-center justify-between gap-2">
          {/* `text-base` (16px, Nível 1 "compacto" da padronização tipográfica
              — não `.text-heading`/`text-h3`): o `CardTitle` base já define
              `text-2xl` via `cn()`, e uma classe customizada nossa perde essa
              disputa de cascata mesmo aparecendo depois — só a escala nativa
              do Tailwind é reconhecida pelo `tailwind-merge` e substitui
              corretamente. */}
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            {title}
          </CardTitle>
          <span className="shrink-0 text-overline text-info normal-case tracking-normal">Ver todas</span>
        </div>
        {subtitle && (
          <p className="text-overline text-muted-foreground mt-2 normal-case tracking-normal">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-3 pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

/* ─── Main Dashboard — Estrutura Full HD ─── */
export default function DashboardPage() {
  const { user } = useAuth();
  const { empresaAtualId } = useEmpresas();
  const isAuthenticated = !!user;
  const { data: statsReal, isLoading: loadingStatsReal, refetch: refetchStats } = useDashboardStats(isAuthenticated);
  const { data: pendenciasReal, isLoading: loadingPendenciasReal } = usePendencias(isAuthenticated);
  // Série de 6 meses do mesmo hook usado pelo Dashboard Executivo — nenhuma
  // query nova foi escrita, apenas reaproveitada para o gráfico de visão geral.
  const { data: executiveKPIsReal, isLoading: loadingEvolucaoReal } = useExecutiveKPIs(empresaAtualId ?? undefined, '6');

  // MOCK VISUAL — nenhuma query real é chamada a mais; apenas trocamos o dado
  // já resolvido acima por um fictício quando a flag está ativa. Para
  // remover, apague este bloco e volte os 3 hooks acima aos nomes originais.
  const dashboardMockActive = isDashboardMockEnabled();
  const stats = dashboardMockActive ? mockDashboardStats : statsReal;
  const loadingStats = dashboardMockActive ? false : loadingStatsReal;
  const pendencias = dashboardMockActive ? mockPendencias : pendenciasReal;
  const loadingPendencias = dashboardMockActive ? false : loadingPendenciasReal;
  const executiveKPIs = dashboardMockActive ? { ...executiveKPIsReal, evolucao: mockEvolucao } : executiveKPIsReal;
  const loadingEvolucao = dashboardMockActive ? false : loadingEvolucaoReal;

  // Linha 4 (Resumo Operacional / Próximas Atividades) — mesmo hook que já
  // alimenta "Próximos Eventos"; chamá-lo de novo aqui não gera uma segunda
  // requisição (`react-query` deduplica pela queryKey 'morning-briefing').
  const { data: briefingReal, isLoading: loadingBriefingReal } = useMorningBriefing();
  const briefing = dashboardMockActive ? mockMorningBriefing : briefingReal;
  const loadingBriefing = dashboardMockActive ? false : loadingBriefingReal;

  const hoje = new Date();
  const greeting = hoje.getHours() < 12 ? "Bom dia" : hoje.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const isEmptySystem = !loadingStats && stats?.colaboradoresAtivos === 0 && stats?.folhaMensal === 0;
  const primeiroNome = (user?.name || user?.email || '').split(/[\\s@]/)[0] || undefined;
  const totalPendencias = pendencias?.reduce((acc, p) => acc + p.quantidade, 0) ?? 0;

  const header = (
    <DashboardHeader
      greeting={greeting}
      userName={primeiroNome}
      isLoading={loadingStats}
      onRefresh={() => refetchStats()}
      actionsSlot={<QuickActionsMenu />}
    />
  );

  const kpis = (
    <div className="grid shrink-0 gap-3 grid-cols-1 sm:grid-cols-5">
      {loadingStats ? (
        Array(5).fill(0).map((_, i) => <KPICardSkeleton key={i} index={i} />)
      ) : (
        <>
          <MetricCard title="Colaboradores Ativos" value={stats?.colaboradoresAtivos || 0} rawValue={stats?.colaboradoresAtivos || 0}
            icon={Users} trend={stats?.colaboradoresAtivos ? { value: 2.5, label: "vs. mês anterior" } : undefined}
            tone="primary" index={0} tooltip={dashboardTooltips.kpis.colaboradoresAtivos} />
          <MetricCard title="Folha Mensal" value={formatCurrency(stats?.folhaMensal || 0)} rawValue={stats?.folhaMensal || 0}
            icon={DollarSign} trend={stats?.folhaMensal ? { value: -1.2, label: "vs. mês anterior" } : undefined}
            description={stats?.folhaMensal ? undefined : "Processamento em andamento"}
            tone="warning" index={1} formatFn={formatCurrency} />
          <MetricCard title="Férias Pendentes" value={stats?.feriasPendentes || 0} rawValue={stats?.feriasPendentes || 0}
            icon={Calendar} description="Próximos 30 dias" tone="info" index={2} />
          <MetricCard title="Banco de Horas" value={`${stats?.bancoHoras && stats.bancoHoras > 0 ? "+" : ""}${stats?.bancoHoras || 0}h`}
            icon={Clock} description="Saldo total" tone="accent" index={3} />
          <MetricCard title="Pendências" value={totalPendencias} rawValue={totalPendencias}
            icon={AlertTriangle} description={totalPendencias > 0 ? "Requerem atenção" : "Nada pendente"}
            tone={totalPendencias > 0 ? "warning" : "primary"} index={4} route="/pendencias" />
        </>
      )}
    </div>
  );

  // Sistema recém-instalado: o onboarding substitui a composição analítica.
  if (isEmptySystem) {
    // Padding horizontal removido — agora vem do `p-page` global em MainLayout's <main>,
    // o mesmo espaçamento sidebar→conteúdo usado por toda a aplicação. Padding vertical
    // mantido como estava (não é o que o padrão global está padronizando).
    return (
      <div className="flex flex-col gap-4 py-4 xl:py-5">
        {header}
        {kpis}
        <OnboardingWizard />
      </div>
    );
  }

  // Padding horizontal removido — vem do `p-page` global em MainLayout's <main> agora.
  return (
    <div className="flex flex-col gap-4 py-3 xl:py-4">
      {header}
      {kpis}

      {/* Zona esquerda (larga) + coluna direita (estreita), esta última
          esticando para cobrir a altura combinada das DUAS linhas da
          esquerda — clone do print: "Status do Sistema" + "Próximos Eventos"
          descem ao lado de "Visão Geral/Departamentos" E de
          "Passivo/Movimentação/Ações em Destaque" ao mesmo tempo. */}
      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <HeadcountOverviewCard
              evolucao={executiveKPIs?.evolucao}
              totalAtivos={stats?.colaboradoresAtivos ?? 0}
              isLoading={loadingEvolucao || loadingStats}
            />
            <DepartmentsCard departamentos={stats?.departamentos} isLoading={loadingStats} />
          </div>

          <AnalyticsSection
            variant="dashboard"
            stats={stats}
            pendencias={pendencias}
            isLoadingStats={loadingStats}
            isLoadingPendencias={loadingPendencias}
            isEmptySystem={isEmptySystem}
            empresaId={empresaAtualId || undefined}
          />
        </div>

        <div className="flex flex-col gap-4">
          {/* `h-[250px] shrink-0` (era `flex-1`, dividindo a coluna meio a
              meio com "Próximos Eventos"): agora bate exatamente com a
              altura de "Departamentos"/"Visão Geral da Empresa" ao lado.
              A diagramação interna do card (linhas com `flex-1` cada) já é
              flexível e se reorganiza sozinha para a nova altura — nenhuma
              mudança foi necessária dentro do `SystemStatusCard`. */}
          <div className="flex h-[250px] shrink-0 flex-col"><SystemStatusCard /></div>
          {/* `h-[220px] shrink-0` (era `flex-1`): bate com a altura de
              "Ações em Destaque" na linha de baixo à esquerda. A lista de
              eventos já é flexível (`flex-1` + scroll interno) e se adapta
              sozinha à nova altura, sem precisar mudar nada dentro do
              `MorningBriefing`. Como bônus, 250+16+220 fecha exatamente com
              a altura total da coluna esquerda (250+16+220). */}
          <div className="flex h-[220px] shrink-0 flex-col"><MorningBriefing variant="compact" /></div>
        </div>
      </div>

      {/* Rodapé — largura total, sem coluna lateral: Resumo Operacional |
          Próximas Atividades | Atividade Recente. Sem `mt-6` extra: somado
          ao `gap-4` do flex-col pai, o respiro acima desta linha (40px)
          ficava bem maior que o `gap-4` (16px) padrão usado entre todas as
          outras linhas do Dashboard — inconsistente com o resto do sistema.
          O `gap-4` do container pai já é suficiente. */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)_minmax(0,1.05fr)]">
        <ResumoOperacionalCard briefing={briefing} pendencias={pendencias} isLoading={loadingBriefing || loadingPendencias} />
        <ProximasAtividadesCard briefing={briefing} maxItems={4} />
        <ListCard icon={History} title="Atividade Recente" subtitle="Últimos eventos auditados">
          <EventTimeline empresaId={empresaAtualId || undefined} maxItems={4} />
        </ListCard>
      </div>
    </div>
  );
}
