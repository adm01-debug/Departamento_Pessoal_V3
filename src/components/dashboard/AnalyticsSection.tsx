import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  Activity,
  PieChart,
  AlertCircle,
  UserPlus,
  UserMinus,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Check,
  XCircle,
  Bell,
  ExternalLink,
  Layers,
  Database,
  Target,
  Zap,
  Scale,
} from 'lucide-react';
import { MiniSparkline } from './MiniSparkline';
import { useNavigate } from 'react-router-dom';
import { AnimatedNumber } from './AnimatedNumber';
import { BarChartWidget } from './BarChartWidget';
import { DonutChart } from './DonutChart';
import { CardSkeleton } from '@/components/ui/module-skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { usePendencias, type Pendencia } from '@/hooks/usePendencias';
import { usePontoMelhorado, type SolicitacaoAjuste } from '@/hooks/usePontoMelhorado';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Portaria671Solicitacao } from '@/services/exportService';
import { useRealTimeSubscription } from '@/hooks/useRealTimeSubscription';
/**
 * Sub-widgets extraídos para `./analytics/widgets` — reduz o tamanho deste
 * arquivo e permite reuso/teste isolado. Re-exportados aqui para preservar
 * qualquer import antigo que aponte para `AnalyticsSection`.
 */
/* eslint-disable react-refresh/only-export-components */
export {
  MotionCard,
  donutColors,
  IndicatorRow,
  QuickStat,
  PendenciaItem,
  AlertasRHWidget,
  CadastroIncompletoWidget,
  ESocialMonitorWidget,
} from './analytics/widgets';
/* eslint-enable react-refresh/only-export-components */
import { PendenciasDetailDialog, type PendenciaListItem } from './analytics/PendenciasDetailDialog';
import { NotificationsDialog, type Notificacao } from './analytics/NotificationsDialog';
import {
  MotionCard,
  donutColors,
  IndicatorRow,
  QuickStat,
  PendenciaItem,
  ESocialMonitorWidget,
  type PendenciaSummary,
} from './analytics/widgets';
export type { PendenciaSummary } from './analytics/widgets';

/* ─── Exports ─── */

interface AnalyticsSectionProps {
  stats:
    | {
        headcount: number;
        admissoesMes: number;
        demissoesMes: number;
        turnover: number;
        absenteismo: number;
        departamentos: { nome: string; count: number }[];
        passivoTotal?: number;
      }
    | undefined;
  pendencias: PendenciaSummary[] | undefined;
  isLoadingStats: boolean;
  isLoadingPendencias: boolean;
  isEmptySystem: boolean;
  empresaId?: string;
}

export function AnalyticsSection({
  stats,
  pendencias,
  isLoadingStats,
  isLoadingPendencias,
  isEmptySystem,
  empresaId,
}: AnalyticsSectionProps) {
  const { data: passivoAll } = useQuery({
    queryKey: ['passivo-summary', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      // Get pro-rated liabilities from RPC or simplified calc
      const { data, error } = await supabase.from('colaboradores').select('id').eq('empresa_id', empresaId!).limit(1);
      if (error) return null;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const passivoTrend = [
    { label: 'Jan', value: 45000 },
    { label: 'Fev', value: 52000 },
    { label: 'Mar', value: 48000 },
    { label: 'Abr', value: 61000 },
    { label: 'Mai', value: 58000 },
  ];

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const itemsPerPage = 5;

  const { data: dbPendencias, isLoading: isLoadingDB, updateStatus } = usePendencias(empresaId);
  const {
    solicitacoes: pontoSolicitacoes,
    isLoading: isLoadingPonto,
    responderSolicitacao,
  } = usePontoMelhorado(empresaId);

  // Real-time Subscriptions for Auto-refresh
  useRealTimeSubscription('solicitacoes_ajuste_ponto', ['solicitacoes-ajuste-ponto', empresaId], empresaId);
  useRealTimeSubscription('notificacoes', ['notificacoes', empresaId], empresaId);
  useRealTimeSubscription('pendencias', ['pendencias', empresaId], empresaId);

  // Notifications State & Logic
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (!empresaId) return;

    // Initial Load of Notifications
    const loadNotifs = async () => {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setNotifications(data as Notificacao[]);
    };
    loadNotifs();

    // Subscribe to new notifications (Toast only, data refresh is handled by useRealTimeSubscription)
    const channel = supabase
      .channel('notif-toast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `empresa_id=eq.${empresaId}` },
        (payload: { new: Notificacao }) => {
          setNotifications((prev) => [payload.new, ...prev]);
          toast.info(payload.new.titulo, {
            description: payload.new.mensagem,
            icon: <Bell className="h-4 w-4 text-primary" />,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId]);

  const markNotifRead = async (id: string) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  };

  const markAllRead = async () => {
    if (!empresaId) return;
    await supabase.from('notificacoes').update({ lida: true }).eq('empresa_id', empresaId).eq('lida', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  // Real-time notifications for Ponto Logic
  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel('ponto-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'solicitacoes_ajuste_ponto', filter: `empresa_id=eq.${empresaId}` },
        (payload: { new: SolicitacaoAjuste }) => {
          const status = payload.new.status;
          if (status === 'aprovado' || status === 'recusado') {
            toast.info(`Solicitação de Ponto ${status === 'aprovado' ? 'aprovada' : 'recusada'}.`, {
              description: `Ajuste para ${payload.new.data_ponto} processado.`,
              icon:
                status === 'aprovado' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                ),
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId]);

  const filteredPendencias = useMemo(() => {
    const list: PendenciaListItem[] = [];

    // Add DB Pendencias
    if (dbPendencias) {
      dbPendencias.forEach((p) => list.push({ ...p, source: 'db' }));
    }

    // Add Ponto Solicitation as Pendencias
    if (pontoSolicitacoes) {
      pontoSolicitacoes
        .filter((s) => s.status === 'enviado')
        .forEach((s) => {
          list.push({
            id: s.id,
            tipo: 'ponto',
            titulo: `Ajuste de Ponto: ${s.colaborador?.nome_completo || 'Colaborador'}`,
            descricao: `Sugerido: ${s.hora_sugerida} - Motivo: ${s.motivo}`,
            prioridade: 'media',
            status: 'pendente',
            criado_at: s.created_at ?? '',
            source: 'ponto',
            raw: s as unknown as Portaria671Solicitacao,
          });
        });
    }

    return list.filter((p) => {
      const matchesSearch =
        p.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.descricao.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || p.tipo === filterType;
      return matchesSearch && matchesType;
    });
  }, [dbPendencias, pontoSolicitacoes, searchQuery, filterType]);

  const paginatedPendencias = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredPendencias.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPendencias, page]);

  const totalPages = Math.ceil(filteredPendencias.length / itemsPerPage);

  const handleOpenDetail = (type?: string) => {
    if (type) setFilterType(type);
    setPage(1);
    setSelectedIds([]);
    setIsDetailOpen(true);
  };

  const handleBatchAction = async (status: 'aprovado' | 'recusado' | 'em_analise' | 'concluido') => {
    if (selectedIds.length === 0) return;

    const promise = Promise.all(
      selectedIds.map(async (id) => {
        const item = filteredPendencias.find((p) => p.id === id);
        if (!item) return;

        if (item.source === 'ponto') {
          const pStatus = status === 'aprovado' || status === 'recusado' ? status : 'recusado';
          await responderSolicitacao.mutateAsync({ id: item.id, status: pStatus });
        } else {
          const dStatus = status === 'em_analise' || status === 'concluido' ? status : 'concluido';
          await updateStatus.mutateAsync({ id: item.id, status: dStatus });
        }
      })
    );

    toast.promise(promise, {
      loading: 'Processando ações em lote...',
      success: 'Ações executadas com sucesso!',
      error: 'Erro ao processar algumas ações.',
    });

    await promise;
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedPendencias.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedPendencias.map((p) => p.id));
    }
  };

  return (
    <>
      {/* Quick Access Top Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <MotionCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          onClick={() => navigate('/workflows')}
          className="border border-border/20 bg-gradient-to-br from-card/50 to-accent/5 rounded-2xl p-4 flex items-center gap-4 group cursor-pointer hover:border-primary/30 transition-all"
        >
          <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold font-display">Workflows</p>
            <p className="text-[10px] text-muted-foreground">Otimização de processos</p>
          </div>
        </MotionCard>
        <MotionCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48 }}
          onClick={() => navigate('/relatorios')}
          className="border border-border/20 bg-gradient-to-br from-card/50 to-accent/5 rounded-2xl p-4 flex items-center gap-4 group cursor-pointer hover:border-info/30 transition-all"
        >
          <div className="p-3 rounded-xl bg-info/10 text-info group-hover:scale-110 transition-transform">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold font-display">BI e Metas</p>
            <p className="text-[10px] text-muted-foreground">Indicadores estratégicos</p>
          </div>
        </MotionCard>
        <MotionCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.51 }}
          onClick={() => navigate('/auditoria')}
          className="border border-border/20 bg-gradient-to-br from-card/50 to-accent/5 rounded-2xl p-4 flex items-center gap-4 group cursor-pointer hover:border-success/30 transition-all"
        >
          <div className="p-3 rounded-xl bg-success/10 text-success group-hover:scale-110 transition-transform">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold font-display">Auditoria</p>
            <p className="text-[10px] text-muted-foreground">Conformidade de dados</p>
          </div>
        </MotionCard>
        <MotionCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.54 }}
          onClick={() => navigate('/assistente-ia')}
          className="border border-border/20 bg-gradient-to-br from-card/50 to-accent/5 rounded-2xl p-4 flex items-center gap-4 group cursor-pointer hover:border-warning/30 transition-all"
        >
          <div className="p-3 rounded-xl bg-warning/10 text-warning group-hover:scale-110 transition-transform">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold font-display">IA Insights</p>
            <p className="text-[10px] text-muted-foreground">Análise preditiva</p>
          </div>
        </MotionCard>
      </div>

      {/* Row 1: 3-col analytics */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <MotionCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden group hover:border-primary/20 transition-all"
        >
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              Evolução Headcount
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ver relatórios"
              onClick={() => navigate('/relatorios')}
              className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isEmptySystem ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-2xl bg-muted/50 mb-3">
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-caption text-muted-foreground font-body">Cadastre colaboradores para visualizar</p>
              </div>
            ) : (
              <BarChartWidget
                data={[
                  {
                    label: 'Headcount',
                    value: stats?.headcount || 0,
                    color: 'bg-gradient-to-t from-primary to-primary-glow',
                  },
                  {
                    label: 'Novos',
                    value: stats?.admissoesMes || 0,
                    color: 'bg-gradient-to-t from-success to-success/70',
                  },
                ]}
                height={140}
              />
            )}
          </CardContent>
        </MotionCard>

        <MotionCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden group hover:border-warning/20 transition-all"
        >
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-warning to-warning-glow">
                <Bell className="h-4 w-4 text-white" />
              </div>
              Notificações
            </CardTitle>
            <div className="flex items-center gap-1">
              {notifications.some((n) => !n.lida) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllRead}
                  className="text-[10px] h-7 px-2 text-primary hover:bg-primary/5"
                >
                  Lidas
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ver notificações"
                onClick={() => setIsNotifOpen(true)}
                className="h-8 w-8 rounded-lg"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map((n, i) => (
                  <div
                    key={n.id}
                    className={cn(
                      'p-2 rounded-xl border transition-all flex gap-3',
                      n.lida ? 'bg-muted/10 border-border/10 opacity-60' : 'bg-primary/5 border-primary/20'
                    )}
                  >
                    <div
                      className={cn(
                        'p-1.5 rounded-lg shrink-0',
                        n.tipo === 'ponto_aprovado' ? 'bg-success/10 text-success' : 'bg-info/10 text-info'
                      )}
                    >
                      <Bell className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate">{n.titulo}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{n.mensagem}</p>
                    </div>
                    {!n.lida && (
                      <button onClick={() => markNotifRead(n.id)} className="p-1 hover:bg-muted rounded-full">
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-caption text-muted-foreground font-body">Sem notificações</p>
                </div>
              )}
            </div>
          </CardContent>
        </MotionCard>

        <MotionCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden group hover:border-info/20 transition-all"
        >
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-info to-info/70">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              Monitor eSocial
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ver eSocial"
              onClick={() => navigate('/esocial')}
              className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ESocialMonitorWidget />
          </CardContent>
        </MotionCard>
      </div>

      {/* Row 2: 4-col details */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Passivo Trabalhista Widget */}
        <MotionCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.62 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden group hover:border-destructive/20 transition-all cursor-pointer"
          onClick={() => navigate('/passivo-trabalhista')}
        >
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-destructive to-destructive/70">
                <Scale className="h-4 w-4 text-white" />
              </div>
              Passivo (Risco)
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Próximo"
              className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-display font-display font-bold text-destructive">
                  <AnimatedNumber
                    value={stats?.passivoTotal || 0}
                    format={(v) =>
                      new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 0,
                      }).format(v)
                    }
                  />
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  Projeção Acumulada
                </p>
              </div>
              <div className="h-10 w-20 opacity-60">
                <MiniSparkline data={[40, 60, 45, 80, 55, 90]} color="hsl(var(--destructive))" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">Provisionamento</span>
                <span className="font-bold text-destructive">Crítico</span>
              </div>
              <div className="h-1.5 bg-destructive/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '85%' }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                  className="h-full bg-destructive rounded-full"
                />
              </div>
            </div>
          </CardContent>
        </MotionCard>

        {/* Movimentação */}
        <MotionCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden"
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary-glow to-primary">
                <Activity className="h-4 w-4 text-primary-foreground" />
              </div>
              Movimentação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingStats ? (
              <div className="space-y-3">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <CardSkeleton key={i} className="h-16" />
                  ))}
              </div>
            ) : (
              <>
                <QuickStat
                  label="Admissões"
                  value={stats?.admissoesMes || 0}
                  icon={UserPlus}
                  gradient="from-primary to-primary-glow"
                  index={0}
                />
                <QuickStat
                  label="Desligamentos"
                  value={stats?.demissoesMes || 0}
                  icon={UserMinus}
                  gradient="from-destructive to-destructive/70"
                  index={1}
                />
                <QuickStat
                  label="Headcount"
                  value={stats?.headcount || 0}
                  icon={Briefcase}
                  gradient="from-primary/80 to-primary"
                  index={2}
                />
              </>
            )}
          </CardContent>
        </MotionCard>

        {/* Departamentos */}
        <MotionCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden"
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <PieChart className="h-4 w-4 text-primary-foreground" />
              </div>
              Departamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <CardSkeleton className="h-48 border-0 p-0" />
            ) : stats?.departamentos && stats.departamentos.length > 0 ? (
              <DonutChart
                segments={stats.departamentos.map((d, i) => ({
                  label: d.nome,
                  value: d.count,
                  color: donutColors[i % donutColors.length],
                }))}
                size={130}
                strokeWidth={14}
                className="flex flex-col items-center"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-4 rounded-2xl bg-muted/50 mb-3">
                  <PieChart className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-caption text-muted-foreground font-body">Nenhum departamento cadastrado</p>
              </div>
            )}
          </CardContent>
        </MotionCard>

        {/* Indicadores */}
        <MotionCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden"
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/80 to-primary">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              Indicadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="space-y-6">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <CardSkeleton key={i} className="h-14 border-0 p-0" />
                  ))}
              </div>
            ) : (
              <div className="space-y-5">
                <IndicatorRow label="Turnover" value={stats?.turnover || 0} maxValue={20} />
                <IndicatorRow label="Absenteísmo" value={stats?.absenteismo || 0} maxValue={10} />
                <IndicatorRow
                  label="Headcount"
                  value={stats?.headcount || 0}
                  maxValue={Math.max((stats?.headcount || 0) * 1.2, 10)}
                  suffix=""
                />
              </div>
            )}
          </CardContent>
        </MotionCard>

        {/* Pendências */}
        <MotionCard
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden"
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/60 to-primary/90">
                <AlertCircle className="h-4 w-4 text-primary-foreground" />
              </div>
              Pendências
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPendencias ? (
              <div className="space-y-3">
                {Array(2)
                  .fill(0)
                  .map((_, i) => (
                    <CardSkeleton key={i} className="h-14 border-0 p-0" />
                  ))}
              </div>
            ) : pendencias && pendencias.length > 0 ? (
              <div className="space-y-2">
                {pendencias.map((p, i) => (
                  <PendenciaItem key={i} pendencia={p} index={i} onClick={() => handleOpenDetail(p.tipo)} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="p-4 rounded-2xl bg-gradient-to-br from-success/20 to-finance/10 mb-3">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <p className="font-display font-semibold">Tudo em dia!</p>
                <p className="text-caption text-muted-foreground font-body mt-1">Nenhuma pendência encontrada</p>
              </motion.div>
            )}
          </CardContent>
        </MotionCard>
      </div>

      {/* Modal de Detalhes de Pendências */}
      <PendenciasDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        items={paginatedPendencias}
        filteredCount={filteredPendencias.length}
        isLoading={isLoadingDB || isLoadingPonto}
        page={page}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={setPage}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onBatchAction={handleBatchAction}
        onPontoRespond={(v) => responderSolicitacao.mutate(v)}
        onPendenciaStatus={(v) => updateStatus.mutate(v)}
      />

      {/* Central de Notificações Modal */}
      <NotificationsDialog
        open={isNotifOpen}
        onOpenChange={setIsNotifOpen}
        notifications={notifications}
        onMarkRead={markNotifRead}
        onMarkAllRead={markAllRead}
      />
    </>
  );
}
