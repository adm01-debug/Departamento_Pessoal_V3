import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  TrendingUp, Activity, Timer, PieChart,
  AlertCircle, UserPlus, UserMinus, Briefcase,
  CheckCircle2, AlertTriangle, Calendar, ChevronRight,
  TrendingDown, Minus, ShieldCheck, Clock, Search, Filter, X,
  Check, Eye, Forward, MoreHorizontal, History, XCircle, ChevronLeft, MapPin, Shield,
  Download, ListChecks, CheckCircle, AlertOctagon, Bell, ExternalLink, FileJson,
  Layers, Database, BarChart3, Target, Zap, Scale
} from 'lucide-react';
import { MiniSparkline } from './MiniSparkline';
import { useNavigate } from 'react-router-dom';
import { AnimatedNumber } from './AnimatedNumber';
import { BarChartWidget } from './BarChartWidget';
import { DonutChart } from './DonutChart';
import { Badge } from '@/components/ui/badge';
import { CardSkeleton } from '@/components/ui/module-skeleton';
import { viewsService } from '@/services/tabelasComplementaresService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { usePendencias, type Pendencia as DB_Pendencia } from '@/hooks/usePendencias';
import { usePontoMelhorado, type SolicitacaoAjuste } from '@/hooks/usePontoMelhorado';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportPortaria671PDF, exportPontoCSV } from '@/services/exportService';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  MotionCard,
  donutColors,
  IndicatorRow,
  QuickStat,
  PendenciaItem,
  AlertasRHWidget,
  CadastroIncompletoWidget,
  ESocialMonitorWidget,
  type PendenciaSummary,
} from './analytics/widgets';
export type { PendenciaSummary } from './analytics/widgets';

/* ─── Exports ─── */

interface AnalyticsSectionProps {
  stats: {
    headcount: number;
    admissoesMes: number;
    demissoesMes: number;
    turnover: number;
    absenteismo: number;
    departamentos: { nome: string; count: number }[];
    passivoTotal?: number;
  } | undefined;
  pendencias: PendenciaSummary[] | undefined;
  isLoadingStats: boolean;
  isLoadingPendencias: boolean;
  isEmptySystem: boolean;
  empresaId?: string;
}

export function AnalyticsSection({ stats, pendencias, isLoadingStats, isLoadingPendencias, isEmptySystem, empresaId }: AnalyticsSectionProps) {
  const { data: passivoAll } = useQuery({
    queryKey: ['passivo-summary', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      // Get pro-rated liabilities from RPC or simplified calc
      const { data, error } = await supabase.from('colaboradores').select('id').eq('empresa_id', empresaId!).limit(1);
      if (error) return null;
      return data;
    },
    staleTime: 10 * 60 * 1000
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const itemsPerPage = 5;

  const { data: dbPendencias, isLoading: isLoadingDB, updateStatus } = usePendencias(empresaId);
  const { solicitacoes: pontoSolicitacoes, isLoading: isLoadingPonto, responderSolicitacao } = usePontoMelhorado(empresaId);

  // Stats for the visual widgets
  const totalPendentes = (dbPendencias?.length || 0) + (pontoSolicitacoes?.filter((s: any) => s.status === 'enviado').length || 0);
  const highPriorityCount = dbPendencias?.filter(p => p.prioridade === 'alta').length || 0;

  // Real-time Subscriptions for Auto-refresh
  useRealTimeSubscription('solicitacoes_ajuste_ponto', ['solicitacoes-ajuste-ponto', empresaId], empresaId);
  useRealTimeSubscription('notificacoes', ['notificacoes', empresaId], empresaId);
  useRealTimeSubscription('pendencias', ['pendencias', empresaId], empresaId);

  // Notifications State & Logic
  const [notifications, setNotifications] = useState<any[]>([]);
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
      if (data) setNotifications(data);
    };
    loadNotifs();

    // Subscribe to new notifications (Toast only, data refresh is handled by useRealTimeSubscription)
    const channel = supabase
      .channel('notif-toast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `empresa_id=eq.${empresaId}` },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          toast.info(payload.new.titulo, {
            description: payload.new.mensagem,
            icon: <Bell className="h-4 w-4 text-primary" />
          });
        }
      )
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [empresaId]);

  const markNotifRead = async (id: string) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  const markAllRead = async () => {
    if (!empresaId) return;
    await supabase.from('notificacoes').update({ lida: true }).eq('empresa_id', empresaId).eq('lida', false);
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
  };

  // Real-time notifications for Ponto Logic
  useEffect(() => {
    if (!empresaId) return;
    const channel = (supabase as any)
      .channel('ponto-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'solicitacoes_ajuste_ponto', filter: `empresa_id=eq.${empresaId}` },
        (payload: any) => {
          const status = payload.new.status;
          if (status === 'aprovado' || status === 'recusado') {
            toast.info(`Solicitação de Ponto ${status === 'aprovado' ? 'aprovada' : 'recusada'}.`, {
              description: `Ajuste para ${payload.new.data_ponto} processado.`,
              icon: status === 'aprovado' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />
            });
          }
        }
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [empresaId]);

  const filteredPendencias = useMemo(() => {
    const list: any[] = [];
    
    // Add DB Pendencias
    if (dbPendencias) {
      dbPendencias.forEach(p => list.push({ ...p, source: 'db' }));
    }
    
    // Add Ponto Solicitation as Pendencias
    if (pontoSolicitacoes) {
      pontoSolicitacoes.filter((s: any) => s.status === 'enviado').forEach((s: any) => {
        list.push({
          id: s.id,
          tipo: 'ponto',
          titulo: `Ajuste de Ponto: ${s.colaborador?.nome_completo || 'Colaborador'}`,
          descricao: `Sugerido: ${s.hora_sugerida} - Motivo: ${s.motivo}`,
          prioridade: 'media',
          status: 'pendente',
          criado_at: s.created_at,
          source: 'ponto',
          raw: s
        });
      });
    }

    return list.filter(p => {
      const matchesSearch = p.titulo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.descricao.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || p.tipo === filterType;
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
    
    const promise = Promise.all(selectedIds.map(async (id) => {
      const item = filteredPendencias.find(p => p.id === id);
      if (!item) return;
      
      if (item.source === 'ponto') {
        const pStatus = (status === 'aprovado' || status === 'recusado') ? status : 'recusado';
        await responderSolicitacao.mutateAsync({ id: item.id, status: pStatus });
      } else {
        const dStatus = (status === 'em_analise' || status === 'concluido') ? status : 'concluido';
        await updateStatus.mutateAsync({ id: item.id, status: dStatus });
      }
    }));

    toast.promise(promise, {
      loading: 'Processando ações em lote...',
      success: 'Ações executadas com sucesso!',
      error: 'Erro ao processar algumas ações.'
    });

    await promise;
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedPendencias.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedPendencias.map(p => p.id));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'media': return 'text-warning bg-warning/10 border-warning/20';
      case 'baixa': return 'text-info bg-info/10 border-info/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };
  return (
    <>
      {/* Quick Access Top Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <MotionCard 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
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
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
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
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.51 }}
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
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}
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
        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden group hover:border-primary/20 transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              Evolução Headcount
            </CardTitle>
            <Button variant="ghost" size="icon" aria-label="Ver relatórios" onClick={() => navigate('/relatorios')} className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
               <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isEmptySystem ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-2xl bg-muted/50 mb-3"><TrendingUp className="h-6 w-6 text-muted-foreground" /></div>
                <p className="text-caption text-muted-foreground font-body">Cadastre colaboradores para visualizar</p>
              </div>
            ) : (
              <BarChartWidget 
                data={[
                  { label: 'Headcount', value: stats?.headcount || 0, color: 'bg-gradient-to-t from-primary to-primary-glow' },
                  { label: 'Novos', value: stats?.admissoesMes || 0, color: 'bg-gradient-to-t from-success to-success/70' }
                ]} 
                height={140} 
              />
            )}
          </CardContent>
        </MotionCard>

        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden group hover:border-warning/20 transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-warning to-warning-glow">
                <Bell className="h-4 w-4 text-white" />
              </div>
              Notificações
            </CardTitle>
            <div className="flex items-center gap-1">
              {notifications.some(n => !n.lida) && (
                <Button variant="ghost" size="sm" onClick={markAllRead} className="text-[10px] h-7 px-2 text-primary hover:bg-primary/5">
                  Lidas
                </Button>
              )}
              <Button variant="ghost" size="icon" aria-label="Ver notificações" onClick={() => setIsNotifOpen(true)} className="h-8 w-8 rounded-lg">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map((n, i) => (
                  <div key={n.id} className={cn("p-2 rounded-xl border transition-all flex gap-3", n.lida ? "bg-muted/10 border-border/10 opacity-60" : "bg-primary/5 border-primary/20")}>
                    <div className={cn("p-1.5 rounded-lg shrink-0", n.tipo === 'ponto_aprovado' ? "bg-success/10 text-success" : "bg-info/10 text-info")}>
                      <Bell className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate">{n.titulo}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{n.mensagem}</p>
                    </div>
                    {!n.lida && <button onClick={() => markNotifRead(n.id)} className="p-1 hover:bg-muted rounded-full"><Check className="h-3 w-3" /></button>}
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

        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden group hover:border-info/20 transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-info to-info/70">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              Monitor eSocial
            </CardTitle>
            <Button variant="ghost" size="icon" aria-label="Ver eSocial" onClick={() => navigate('/esocial')} className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
               <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent><ESocialMonitorWidget /></CardContent>
        </MotionCard>
      </div>


      {/* Row 2: 4-col details */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Passivo Trabalhista Widget */}
        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}
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
            <Button variant="ghost" size="icon" aria-label="Próximo" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
               <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-display font-display font-bold text-destructive">
                  <AnimatedNumber value={stats?.passivoTotal || 0} format={(v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)} />
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Projeção Acumulada</p>
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
                  <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} transition={{ duration: 1.5, delay: 0.5 }} className="h-full bg-destructive rounded-full" />
               </div>
            </div>
          </CardContent>
        </MotionCard>

        {/* Movimentação */}
        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
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
              <div className="space-y-3">{Array(3).fill(0).map((_, i) => <CardSkeleton key={i} className="h-16" />)}</div>
            ) : (
              <>
                <QuickStat label="Admissões" value={stats?.admissoesMes || 0} icon={UserPlus} gradient="from-primary to-primary-glow" index={0} />
                <QuickStat label="Desligamentos" value={stats?.demissoesMes || 0} icon={UserMinus} gradient="from-destructive to-destructive/70" index={1} />
                <QuickStat label="Headcount" value={stats?.headcount || 0} icon={Briefcase} gradient="from-primary/80 to-primary" index={2} />
              </>
            )}
          </CardContent>
        </MotionCard>

        {/* Departamentos */}
        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <PieChart className="h-4 w-4 text-primary-foreground" />
              </div>
              Departamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <CardSkeleton className="h-48 border-0 p-0" /> :
              stats?.departamentos && stats.departamentos.length > 0 ? (
                <DonutChart
                  segments={stats.departamentos.map((d, i) => ({ label: d.nome, value: d.count, color: donutColors[i % donutColors.length] }))}
                  size={130} strokeWidth={14} className="flex flex-col items-center"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-4 rounded-2xl bg-muted/50 mb-3"><PieChart className="h-8 w-8 text-muted-foreground" /></div>
                  <p className="text-caption text-muted-foreground font-body">Nenhum departamento cadastrado</p>
                </div>
              )}
          </CardContent>
        </MotionCard>

        {/* Indicadores */}
        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
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
              <div className="space-y-6">{Array(3).fill(0).map((_, i) => <CardSkeleton key={i} className="h-14 border-0 p-0" />)}</div>
            ) : (
              <div className="space-y-5">
                <IndicatorRow label="Turnover" value={stats?.turnover || 0} maxValue={20} />
                <IndicatorRow label="Absenteísmo" value={stats?.absenteismo || 0} maxValue={10} />
                <IndicatorRow label="Headcount" value={stats?.headcount || 0} maxValue={Math.max((stats?.headcount || 0) * 1.2, 10)} suffix="" />
              </div>
            )}
          </CardContent>
        </MotionCard>

        {/* Pendências */}
        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
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
              <div className="space-y-3">{Array(2).fill(0).map((_, i) => <CardSkeleton key={i} className="h-14 border-0 p-0" />)}</div>
            ) : pendencias && pendencias.length > 0 ? (
              <div className="space-y-2">
                {pendencias.map((p, i) => (
                  <PendenciaItem 
                    key={i} 
                    pendencia={p} 
                    index={i} 
                    onClick={() => handleOpenDetail(p.tipo)}
                  />
                ))}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center">
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
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border-border/40 shadow-2xl glass">
          <DialogHeader className="p-6 pb-4 border-b border-border/10 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Lista de Pendências
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Visualize e tome ações rápidas sobre os itens pendentes do sistema.
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 items-center">
              <div className="relative flex-1 group w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Buscar por título ou descrição..."
                  className="pl-10 h-11 rounded-xl bg-muted/40 border-border/20 focus:bg-background transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'ferias', 'assinaturas', 'ponto', 'documentos'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "rounded-lg h-11 px-4 font-medium transition-all text-xs whitespace-nowrap",
                      filterType === type ? "shadow-lg shadow-primary/20" : "bg-muted/20 border-border/10"
                    )}
                    onClick={() => setFilterType(type)}
                  >
                    {type === 'all' ? 'Todos' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{selectedIds.length} selecionados</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="gradient-success" className="h-9 px-4 gap-2 rounded-lg" onClick={() => handleBatchAction('aprovado')}>
                      <CheckCircle className="h-3.5 w-3.5" /> Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" className="h-9 px-4 gap-2 rounded-lg" onClick={() => handleBatchAction('recusado')}>
                      <AlertOctagon className="h-3.5 w-3.5" /> Recusar
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-muted/5">
            <div className="flex items-center gap-3 mb-4 p-1 px-2">
              <Checkbox 
                id="select-all" 
                checked={selectedIds.length === paginatedPendencias.length && paginatedPendencias.length > 0}
                onCheckedChange={toggleSelectAll}
                className="rounded-md border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label htmlFor="select-all" className="text-xs font-medium cursor-pointer text-muted-foreground select-none">
                Selecionar Todos na página
              </label>
            </div>
            {isLoadingDB || isLoadingPonto ? (
              <div className="space-y-4">
                {Array(4).fill(0).map((_, i) => <CardSkeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
            ) : paginatedPendencias.length > 0 ? (
              <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                  {paginatedPendencias.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      className="group p-5 rounded-2xl glass border border-border/30 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                      
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4">
                            <div className="pt-1">
                              <Checkbox 
                                checked={selectedIds.includes(item.id)}
                                onCheckedChange={() => toggleSelect(item.id)}
                                className="rounded-md border-primary/50"
                              />
                            </div>
                            <div className={cn(
                              "p-3 rounded-2xl bg-gradient-to-br shrink-0 shadow-lg",
                              item.tipo === 'ferias' ? "from-primary/80 to-primary" :
                              item.tipo === 'ponto' ? "from-warning/80 to-warning" :
                              item.tipo === 'assinaturas' ? "from-success/80 to-success" : "from-info/80 to-info"
                            )}>
                              {item.tipo === 'ferias' ? <Calendar className="h-5 w-5 text-white" /> :
                               item.tipo === 'ponto' ? <Clock className="h-5 w-5 text-white" /> :
                               item.tipo === 'assinaturas' ? <ShieldCheck className="h-5 w-5 text-white" /> : <Briefcase className="h-5 w-5 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-display font-bold text-lg leading-tight">{item.titulo}</h4>
                                <Badge className={cn("text-[10px] font-bold uppercase tracking-wider py-0.5", getPriorityColor(item.prioridade))}>
                                  {item.prioridade}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] opacity-70">
                                  {format(new Date(item.criado_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                                {item.descricao}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Visualizar"
                              className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                              onClick={() => window.open(`/detalhes/${item.referencia_id || item.id}`, '_blank', 'noopener')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Mais opções" className="h-10 w-10 rounded-xl">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 border-border/40 shadow-xl glass">
                                <DropdownMenuItem 
                                  className="rounded-lg gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary" 
                                  onClick={() => {
                                    if (item.source === 'ponto') {
                                      responderSolicitacao.mutate({ id: item.id, status: 'aprovado' });
                                    } else {
                                      updateStatus.mutate({ id: item.id, status: 'concluido' });
                                    }
                                  }}
                                >
                                  <Check className="h-4 w-4" /> Aprovar / Concluir
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="rounded-lg gap-2 cursor-pointer focus:bg-warning/10 focus:text-warning" 
                                  onClick={() => {
                                    if (item.source === 'ponto') {
                                      responderSolicitacao.mutate({ id: item.id, status: 'recusado', observacoes: 'Necessita revisão.' });
                                    } else {
                                      updateStatus.mutate({ id: item.id, status: 'em_analise' });
                                    }
                                  }}
                                >
                                  <Activity className="h-4 w-4" /> {item.source === 'ponto' ? 'Recusar' : 'Marcar Revisão'}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer">
                                  <Forward className="h-4 w-4" /> Encaminhar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Compliance & History Highlight for Ponto */}
                        {item.source === 'ponto' && item.raw && (
                          <div className="mt-2 space-y-4">
                            <Tabs defaultValue="highlights" className="w-full">
                              <TabsList className="grid grid-cols-2 h-8 mb-3 bg-muted/50 p-1">
                                <TabsTrigger value="highlights" className="text-[10px] py-1">Destaques Críticos</TabsTrigger>
                                <TabsTrigger value="history" className="text-[10px] py-1">Histórico de Alterações</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="highlights" className="mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2 group/card">
                                    <MapPin className="h-4 w-4 text-primary opacity-70 group-hover/card:scale-110 transition-transform" />
                                    <div className="text-[10px]">
                                      <p className="text-muted-foreground font-bold uppercase">Timezone</p>
                                      <p className="font-semibold text-foreground">{item.raw.relatorio_conformidade?.timezone || 'America/Sao_Paulo'}</p>
                                    </div>
                                  </div>
                                  <div className="p-3 rounded-xl bg-warning/5 border border-warning/10 flex items-center gap-2 group/card">
                                    <History className="h-4 w-4 text-warning opacity-70 group-hover/card:rotate-[-45deg] transition-transform" />
                                    <div className="text-[10px]">
                                      <p className="text-muted-foreground font-bold uppercase">Hora Original</p>
                                      <p className="font-semibold text-foreground">{item.raw.hora_original?.substring(0, 5) || 'Não registrada'}</p>
                                    </div>
                                  </div>
                                  <div className="p-3 rounded-xl bg-success/5 border border-success/10 flex items-center gap-2 group/card">
                                    <Shield className="h-4 w-4 text-success opacity-70 group-hover/card:scale-110 transition-transform" />
                                    <div className="text-[10px]">
                                      <p className="text-muted-foreground font-bold uppercase">Geofencing</p>
                                      <p className={cn("font-semibold", item.raw.relatorio_conformidade?.geofencing ? "text-success" : "text-destructive")}>
                                        {item.raw.relatorio_conformidade?.geofencing ? 'Dentro do Perímetro' : 'Fora do Perímetro'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="history" className="mt-0">
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/10">
                                  <div className="flex items-center justify-between text-[10px] mb-3 pb-2 border-b border-border/5">
                                    <span className="font-bold text-muted-foreground uppercase">Campo</span>
                                    <span className="font-bold text-muted-foreground uppercase text-right">Comparação (De → Para)</span>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-muted-foreground">Hora do Ponto</span>
                                      <span className="font-medium">
                                        <span className="text-destructive line-through opacity-70 mr-2">{item.raw.hora_original?.substring(0, 5) || '--:--'}</span>
                                        <ChevronRight className="h-3 w-3 inline text-muted-foreground mx-1" />
                                        <span className="text-success font-bold ml-1">{item.raw.hora_sugerida?.substring(0, 5)}</span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-muted-foreground">Minutos de Divergência</span>
                                      <span className="font-medium text-warning">{item.raw.relatorio_conformidade?.divergencia_minutos || 0} min</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-muted-foreground">Integridade (SHA256)</span>
                                      <span className="font-mono text-[9px] truncate max-w-[120px] text-muted-foreground">{item.raw.relatorio_conformidade?.sha256_integridade?.slice(0, 12)}...</span>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>
                            </Tabs>
                            
                            <div className="flex justify-end gap-2 pt-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[10px] gap-2 rounded-lg hover:bg-primary/5 transition-colors"
                                onClick={() => exportPortaria671PDF(item.raw)}
                              >
                                <Download className="h-3 w-3" /> Exportar PDF (Portaria 671)
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-[10px] gap-2 rounded-lg"
                                onClick={() => exportPontoCSV([item.raw], `conformidade-${item.id.slice(0, 8)}.csv`)}
                              >
                                <FileJson className="h-3 w-3" /> Exportar CSV
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 p-4 bg-muted/20 rounded-2xl border border-border/10">
                    <p className="text-xs text-muted-foreground">
                      Mostrando {Math.min(filteredPendencias.length, (page - 1) * itemsPerPage + 1)}-{Math.min(filteredPendencias.length, page * itemsPerPage)} de {filteredPendencias.length}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="h-9 w-9 p-0 rounded-lg"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1 px-2">
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setPage(i + 1)}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all",
                              page === i + 1 ? "bg-primary w-4" : "bg-primary/20 hover:bg-primary/40"
                            )}
                          />
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="h-9 w-9 p-0 rounded-lg"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="p-6 rounded-3xl bg-muted/20 mb-4 border border-border/10">
                  <X className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-display font-bold">Nenhuma pendência</h3>
                <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                  Não encontramos itens que correspondam à sua busca ou filtro.
                </p>
                <Button variant="outline" className="mt-6 rounded-xl px-8" onClick={() => { setSearchQuery(""); setFilterType("all"); }}>
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 border-t border-border/10 bg-muted/5">
            <Button variant="outline" className="rounded-xl px-8" onClick={() => setIsDetailOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Central de Notificações Modal */}
      <Dialog open={isNotifOpen} onOpenChange={setIsNotifOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 rounded-2xl border-border/40 shadow-2xl glass">
          <DialogHeader className="p-6 pb-4 border-b border-border/10">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-display font-bold">Central de Notificações</DialogTitle>
                <DialogDescription>Histórico de aprovações e ações do sistema.</DialogDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">Marcar todas como lidas</Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className={cn(
                    "p-4 rounded-2xl border transition-all relative group",
                    n.lida ? "bg-muted/10 border-border/10 opacity-60" : "bg-primary/5 border-primary/20 shadow-xs"
                  )}>
                    <div className="flex gap-4">
                      <div className={cn(
                        "p-2.5 rounded-xl shrink-0",
                        n.tipo === 'ponto_aprovado' ? "bg-success/10 text-success" : 
                        n.tipo === 'ponto_recusado' ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info"
                      )}>
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-sm">{n.titulo}</h4>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(n.created_at), "dd/MM/yyyy HH:mm")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{n.mensagem}</p>
                      </div>
                      {!n.lida && (
                        <Button variant="ghost" size="icon" aria-label="Marcar como lida" onClick={() => markNotifRead(n.id)} className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Bell className="h-10 w-10 mb-2 opacity-20" />
                <p>Nenhuma notificação encontrada.</p>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t border-border/10">
            <Button variant="outline" className="rounded-xl" onClick={() => setIsNotifOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
