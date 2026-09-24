import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  TrendingUp, ArrowUp, Activity, PieChart,
  AlertCircle, UserPlus, UserMinus, Briefcase,
  CheckCircle2, Calendar, ChevronRight,
  ShieldCheck, Clock, Search, X,
  Check, Eye, Forward, MoreHorizontal, History, XCircle, ChevronLeft, MapPin, Shield,
  Download, ListChecks, CheckCircle, AlertOctagon, Bell, ExternalLink, FileJson,
  Layers, Database, Target, Zap, Scale
} from 'lucide-react';
import { MiniSparkline } from './MiniSparkline';
import { useNavigate } from 'react-router-dom';
import { AnimatedNumber } from './AnimatedNumber';
import { BarChartWidget } from './BarChartWidget';
import { DonutChart } from './DonutChart';
import { Badge } from '@/components/ui/badge';
import { CardSkeleton } from '@/components/ui/module-skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { usePendencias } from '@/hooks/usePendencias';
import { usePontoMelhorado } from '@/hooks/usePontoMelhorado';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportPortaria671PDF, exportPontoCSV } from '@/services/exportService';
import { loggerService } from '@/services/loggerService';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealTimeSubscription } from '@/hooks/useRealTimeSubscription';

/** Gera nome de canal único para evitar colisão em StrictMode + re-subscription. */
const uid = () => crypto.randomUUID().split('-')[0];
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
  MiniStat,
  PendenciaItem,
  AlertasRHWidget,
  CadastroIncompletoWidget,
  ESocialMonitorWidget} from './analytics/widgets';
/* eslint-enable react-refresh/only-export-components */
import {
  MotionCard,
  donutColors,
  IndicatorRow,
  QuickStat,
  MiniStat,
  PendenciaItem,


  ESocialMonitorWidget,
  type PendenciaSummary} from './analytics/widgets';
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
  /**
   * `default` — composição histórica (barra de acesso rápido + 3 cards de
   * topo + 5 cards de detalhe). Usada pelo Dashboard Executivo.
   *
   * `dashboard` — apenas a faixa de 4 cards de detalhe (Passivo, Movimentação,
   * Ações em Destaque e Panorama), na proporção da referência do Dashboard.
   * Os cards omitidos foram realocados para outros pontos da página; toda a
   * lógica (realtime, modais de pendências e de notificações) segue montada.
   */
  variant?: 'default' | 'dashboard';
}

export function AnalyticsSection({ stats, pendencias, isLoadingStats, isLoadingPendencias, isEmptySystem, empresaId, variant = 'default' }: AnalyticsSectionProps) {
  const isDashboard = variant === 'dashboard';
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

  // Não há, hoje, um percentual real de "provisionamento" calculado a partir
  // dos dados (só existe o valor acumulado `passivoTotal`). Este número já
  // existia hardcoded como largura da barra antes desta mudança — mantido
  // como está (não inventado agora) e agora também exibido como rótulo, em
  // vez de um texto fixo desacoplado ("Crítico") sem relação com a barra.
  const provisionamentoPct = 85;
  // Idem: não existe, na base atual, uma variação percentual histórica do
  // passivo total (nenhuma série/delta é calculada em nenhum hook). O badge
  // de tendência ao lado do valor é, portanto, ilustrativo — mesmo
  // tratamento que os KPIs do topo do Dashboard já usam hoje para os campos
  // `trend` (ver `DashboardPage.tsx`, valores fixos como 2.5 / -1.2), não
  // uma métrica computada nova.
  const passivoTrendPct = 12;

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
  interface Notificacao {
    id: string;
    titulo: string;
    mensagem: string;
    tipo: string;
    lida: boolean;
    created_at: string;
  }
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (!empresaId) return;

    const channelName = `notif-toast-${uid()}`;

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
    void loadNotifs();

    // Subscribe to new notifications (Toast only, data refresh is handled by useRealTimeSubscription)
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `empresa_id=eq.${empresaId}` },
        (payload: { new: Notificacao }) => {
          setNotifications(prev => [payload.new, ...prev]);
          toast.info(payload.new.titulo, {
            description: payload.new.mensagem,
            icon: <Bell className="h-4 w-4 text-primary" />
          });
        }
      );

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        loggerService.warn(`Realtime channel ${channelName} failed to subscribe`);
      }
    });

    return () => { void supabase.removeChannel(channel); };
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
    const channelName = `ponto-changes-${uid()}`;
    const channel = (supabase as any)
      .channel(channelName)
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
      );

    channel.subscribe();
    return () => { void (supabase as any).removeChannel(channel); };
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
      {!isDashboard && (
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
            <p className="text-sm font-medium font-display">Workflows</p>
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
            <p className="text-sm font-medium font-display">BI e Metas</p>
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
            <p className="text-sm font-medium font-display">Auditoria</p>
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
            <p className="text-sm font-medium font-display">IA Insights</p>
            <p className="text-[10px] text-muted-foreground">Análise preditiva</p>
          </div>
        </MotionCard>
      </div>
      )}

      {/* Row 1: 3-col analytics */}
      {!isDashboard && (
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden group hover:border-primary/20 transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 font-display">
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
            <CardTitle className="flex items-center gap-2.5 font-display">
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
                      <p className="text-[11px] font-medium truncate">{n.titulo}</p>
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
            <CardTitle className="flex items-center gap-2.5 font-display">
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
      )}


      {/* Row 2. No Dashboard são 3 colunas (Passivo | Movimentação | Ações em
          Destaque), na proporção da referência — "Panorama" não existe no
          print e fica oculto aqui; suas métricas continuam visíveis no
          Dashboard (Turnover/Absenteísmo no card "Saúde RH" e Headcount nos
          KPIs e em "Movimentação"). O Dashboard Executivo segue com as 4. */}
      <div className={cn(
        'grid gap-4 grid-cols-1',
        isDashboard
          ? 'lg:grid-cols-3'
          : 'sm:grid-cols-2 lg:grid-cols-4',
      )}>
        {/* Passivo Trabalhista Widget */}
        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}
          className={cn(
            'border overflow-hidden group hover:border-destructive/20 transition-all cursor-pointer',
            isDashboard ? 'border-border/60 rounded-xl flex h-[220px] flex-col xl:order-1' : 'border-border/30 shadow-elevated rounded-2xl',
          )}
          onClick={() => navigate('/passivo-trabalhista')}
        >
          <CardHeader className={cn('pb-3 flex flex-row items-center justify-between', isDashboard && 'p-3 pb-2 space-y-0')}>
            <CardTitle className="flex items-center gap-2.5 font-display text-base">
              {/* Ícone com o tom mais saturado da paleta (#FF0000→#FF2C2C):
                  é o primeiro elemento que o olho encontra, então recebe o
                  vermelho mais "cru" — só no card do Dashboard; a variante
                  do Executivo mantém o gradiente `destructive` de sempre. */}
              <div className={cn(
                'p-1.5 rounded-lg shrink-0',
                isDashboard ? 'bg-gradient-to-br from-[#FF0000] to-[#FF2C2C]' : 'bg-gradient-to-br from-destructive to-destructive/70',
              )}>
                <Scale className="h-4 w-4 text-white" />
              </div>
              {/* Header em duas linhas (título + subtítulo) — mesmo padrão de
                  "Resumo Operacional"/"ListCard", só que a segunda linha vive
                  dentro do próprio `CardTitle` (junto do ícone) porque na
                  referência o ícone acompanha as duas linhas, não só a
                  primeira. `leading-snug` no `<span>` do título sobrescreve
                  o que o `<h3>` do `CardTitle` herda (`leading-none`), que
                  senão vaza por herança de CSS. Subtítulo no mesmo padrão
                  `.text-overline` + `normal-case tracking-normal` usado nos
                  demais cards (Departamentos, Visão Geral da Empresa etc.) —
                  cancela o uppercase/tracking largo do token, mantendo só o
                  tamanho de 10px. */}
              {isDashboard ? (
                <span className="flex flex-col">
                  <span className="leading-snug">Passivo Trabalhista (Risco)</span>
                  <span className="mt-1 block text-overline font-normal normal-case tracking-normal text-muted-foreground">
                    Valor acumulado e percentual de provisionamento.
                  </span>
                </span>
              ) : (
                'Passivo (Risco)'
              )}
            </CardTitle>
            {!isDashboard && (
              <Button variant="ghost" size="icon" aria-label="Próximo" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                 <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          {/* Sem `justify-between` no container: a linha do valor é que
              recebe `flex-1` logo abaixo e absorve o espaço sobrando dentro
              da altura fixa do card — ver comentário junto dela. */}
          <CardContent className={cn('space-y-4', isDashboard && 'flex min-h-0 flex-1 flex-col gap-3 space-y-0 p-3 pt-0')}>
            {/* Valor + badge de tendência viram uma COLUNA fixa (não mais uma
                linha com `flex-wrap`): antes, em cards estreitos, a etiqueta
                "↑12%" não cabia ao lado do valor grande e quebrava pra baixo
                de forma imprevisível — sem hierarquia clara entre os dois.
                Agora é sempre valor em cima (maior, dominante) e badge
                pequeno embaixo, deterministicamente. `items-center` alinha
                essa coluna contra o centro do sparkline, que ficou bem mais
                alto que ela. */}
            <div className={cn('flex items-center justify-between gap-4', isDashboard && 'flex-1')}>
              <div className="min-w-0">
                {/* Valor no tom médio da paleta (#FF2C2C) — vívido, mas um
                    degrau abaixo do ícone, pra não competir com ele pela
                    atenção. Fora do Dashboard, mantém `text-destructive` de
                    sempre. Exceção deliberada ao Nível 2 padrão (24px/700,
                    `.text-data`): pedido explícito para este valor ficar
                    maior que os demais KPIs — `text-3xl` (30px, mesmo tamanho
                    já usado aqui antes da padronização) sobrescreve só o
                    tamanho; `.text-data` continua dando a família Outfit, o
                    letter-spacing e o peso 700 (bold — não mais extrabold,
                    revisado na passada de leveza tipográfica: o "maior" fica,
                    o "mais grosso" não). Cabe sem sobrepor nada: a caixa do
                    sparkline ao lado é fixa em 80px de altura, bem maior que
                    a coluna valor+badge mesmo nesse tamanho. */}
                <p className={cn(isDashboard ? 'text-data text-3xl text-[#FF2C2C]' : 'text-display text-destructive')}>
                  <AnimatedNumber value={stats?.passivoTotal || 0} format={(v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)} />
                </p>
                {isDashboard && (
                  // Badge no tom mais claro da paleta (#FF5353) — deliberadamente
                  // mais suave que o valor acima, reforçando que é uma nota
                  // secundária (tendência), não o dado principal do card.
                  // `.text-overline` (Nível 3 denso, 10px) — mesmo padrão do
                  // badge de tendência do `MetricCard`.
                  <span className="mt-1.5 inline-flex items-center gap-0.5 rounded-full bg-[#FF5353]/15 px-1.5 py-0.5 text-overline font-medium text-[#FF5353]">
                    <ArrowUp className="h-3 w-3" />
                    {passivoTrendPct}%
                  </span>
                )}
              </div>
              {isDashboard && (
                // `mr-1`: afasta o gráfico da borda direita do card sem
                // encolher o ganho de tamanho pedido antes — o `gap-4` do
                // container pai já separa do bloco de valor à esquerda.
                // Cor no tom mais saturado (#FF0000), igual ao ícone: é um
                // elemento gráfico, precisa do vermelho mais vívido pra se
                // destacar contra o fundo escuro do card.
                <div className="mr-1 h-20 w-32 shrink-0">
                  {/* `width`/`height` em px batendo exatamente com a caixa
                      (h-20=80px / w-32=128px) — sem isso o SVG renderiza no
                      tamanho padrão do componente (80×28), bem menor que a
                      caixa que o envolve. */}
                  <MiniSparkline
                    data={[40, 60, 45, 80, 55, 90]}
                    color="#FF0000"
                    width={128}
                    height={80}
                    strokeWidth={2.5}
                    fillOpacity={0.55}
                  />
                </div>
              )}
            </div>

            {!isDashboard && (
              <div className="h-10 w-20 opacity-60">
                <MiniSparkline data={[40, 60, 45, 80, 55, 90]} color="hsl(var(--destructive))" />
              </div>
            )}

            {/* Sem `mt-auto` aqui: agora é a linha do valor (`flex-1` acima)
                que absorve o espaço sobrando, então este bloco já cai
                naturalmente colado nela, sem precisar de uma margem extra
                para "empurrar" — a folga vira respiro em volta do gráfico,
                não um vão solto entre as duas seções. */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-caption">
                <span className="text-muted-foreground font-medium">Provisionamento</span>
                {/* Mesmo tom do valor principal (#FF2C2C) — os dois números
                    "hero" do card ficam no mesmo degrau da hierarquia. */}
                <span className={cn('font-medium', isDashboard ? 'text-[#FF2C2C]' : 'text-destructive')}>{provisionamentoPct}%</span>
              </div>
              <div className="h-1.5 bg-destructive/10 rounded-full overflow-hidden">
                {/* Degradê com 3 tons reais (não só opacidade do mesmo
                    vermelho): mais claro no início, mais intenso perto do
                    fim — reforça visualmente "risco subindo". */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${provisionamentoPct}%` }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                  className={cn(
                    'h-full rounded-full',
                    isDashboard ? 'bg-gradient-to-r from-[#FF5353] via-[#FF2C2C] to-[#FF0000]' : 'bg-gradient-to-r from-destructive/60 via-destructive to-destructive',
                  )}
                />
              </div>
            </div>
          </CardContent>
        </MotionCard>

        {/* Movimentação */}
        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className={cn(
            'border overflow-hidden',
            isDashboard ? 'border-border/60 rounded-xl flex h-[220px] flex-col xl:order-2' : 'border-border/30 shadow-elevated rounded-2xl',
          )}>
          <CardHeader className={cn('pb-3', isDashboard && 'p-3 pb-2 space-y-0')}>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2.5 font-display text-base">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary-glow to-primary shrink-0">
                  <Activity className="h-4 w-4 text-primary-foreground" />
                </div>
                Movimentação
              </CardTitle>
              {/* `text-[10px]` além de `text-overline`: `Button` já injeta
                  `text-sm` na própria base, que vence a cascata sobre o
                  token customizado — só a escala nativa/arbitrária do
                  Tailwind é reconhecida pelo `tailwind-merge` e substitui
                  corretamente (mesmo mecanismo de "Ações em Destaque" logo
                  abaixo e de vários badges já corrigidos). */}
              {isDashboard && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/relatorios')} className="h-7 shrink-0 px-2 text-overline text-[10px] text-info normal-case tracking-normal hover:bg-info/5">
                  Ver detalhes
                </Button>
              )}
            </div>
            {isDashboard && (
              <p className="mt-1.5 text-overline font-normal text-muted-foreground normal-case tracking-normal">Este mês</p>
            )}
          </CardHeader>
          {/* Sem `justify-around`: os 3 tiles agora vêm de um `grid-cols-3`
              (largura/gap determinísticos), não de espaço distribuído entre
              itens soltos flutuando no meio do card. */}
          <CardContent className={cn('space-y-3', isDashboard && 'flex min-h-0 flex-1 flex-col p-3 pt-0')}>
            {isLoadingStats ? (
              <div className={isDashboard ? 'grid grid-cols-3 gap-2' : 'space-y-3'}>
                {Array(3).fill(0).map((_, i) => <CardSkeleton key={i} className={isDashboard ? 'h-20' : 'h-16'} />)}
              </div>
            ) : isDashboard ? (
              // `content-center`: grid de 1 fileira auto-height — sem isso o
              // `flex-1` do container deixa o espaço sobrando embaixo da
              // fileira (grid não centraliza sozinho como o `items-center`
              // do flex fazia antes).
              <div className="grid flex-1 grid-cols-3 content-center gap-2">
                <MiniStat label="Admissões" value={stats?.admissoesMes || 0} icon={UserPlus} tone="bg-primary/10 text-primary" index={0} />
                <MiniStat label="Desligamentos" value={stats?.demissoesMes || 0} icon={UserMinus} tone="bg-destructive/10 text-destructive" index={1} />
                <MiniStat label="Headcount" value={stats?.headcount || 0} icon={Briefcase} tone="bg-info/10 text-info" index={2} />
              </div>
            ) : (
              <>
                <QuickStat label="Admissões" value={stats?.admissoesMes || 0} icon={UserPlus} gradient="from-primary to-primary-glow" index={0} />
                <QuickStat label="Desligamentos" value={stats?.demissoesMes || 0} icon={UserMinus} gradient="from-destructive to-destructive/70" index={1} />
                <QuickStat label="Headcount" value={stats?.headcount || 0} icon={Briefcase} gradient="from-primary/80 to-primary" index={2} />
              </>
            )}
          </CardContent>
        </MotionCard>

        {/* Departamentos — no Dashboard vive em card próprio na linha superior */}
        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className={cn(
            'border border-border/30 shadow-elevated rounded-2xl overflow-hidden',
            isDashboard && 'hidden',
          )}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 font-display">
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

        {/* Indicadores — "Panorama" na referência do Dashboard */}
        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
          className={cn(
            'border overflow-hidden',
            isDashboard ? 'hidden' : 'border-border/30 shadow-elevated rounded-2xl',
          )}>
          <CardHeader className={cn('pb-3', isDashboard && 'p-3 pb-1.5 space-y-0')}>
            <CardTitle className="flex items-center gap-2.5 font-display text-base">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/80 to-primary">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              {isDashboard ? 'Panorama' : 'Indicadores'}
            </CardTitle>
          </CardHeader>
          {/* Mesma correção: as 3 linhas de indicador ancoram no topo. */}
          <CardContent className={cn(isDashboard && 'flex min-h-0 flex-1 flex-col p-3 pt-0')}>
            {isLoadingStats ? (
              <div className="space-y-6">{Array(3).fill(0).map((_, i) => <CardSkeleton key={i} className="h-14 border-0 p-0" />)}</div>
            ) : (
              <div className={cn(isDashboard ? 'space-y-5' : 'space-y-5')}>
                <IndicatorRow label="Turnover" value={stats?.turnover || 0} maxValue={20} />
                <IndicatorRow label="Absenteísmo" value={stats?.absenteismo || 0} maxValue={10} />
                <IndicatorRow label="Headcount" value={stats?.headcount || 0} maxValue={Math.max((stats?.headcount || 0) * 1.2, 10)} suffix="" direction="higher-better" />
              </div>
            )}
          </CardContent>
        </MotionCard>

        {/* Pendências — "Ações em Destaque" na referência do Dashboard */}
        <MotionCard initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className={cn(
            'border overflow-hidden',
            isDashboard ? 'border-border/60 rounded-xl flex h-[220px] flex-col xl:order-3' : 'border-border/30 shadow-elevated rounded-2xl',
          )}>
          <CardHeader className={cn('pb-3 flex flex-row items-center justify-between', isDashboard && 'p-3 pb-1.5 space-y-0')}>
            <CardTitle className="flex items-center gap-2 font-display whitespace-nowrap text-base">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/60 to-primary/90 shrink-0">
                <AlertCircle className="h-4 w-4 text-primary-foreground" />
              </div>
              {isDashboard ? 'Ações em Destaque' : 'Pendências'}
            </CardTitle>
            {/* `text-[10px]` além de `text-overline`: mesmo bug de cascata
                do botão "Ver detalhes" da Movimentação — `Button` injeta
                `text-sm` na própria base e vencia o token customizado. */}
            {isDashboard && (
              <Button variant="ghost" size="sm" onClick={() => handleOpenDetail()} className="h-7 px-2 text-overline text-[10px] text-info normal-case tracking-normal hover:bg-info/5">
                Ver todas
              </Button>
            )}
          </CardHeader>
          {/* Sem scroll interno no Dashboard: a referência mostra sempre um
              número fixo e curto de itens (3), nunca rola. Com dados reais
              podendo ter mais tipos de pendência que isso, mostramos os 3
              mais relevantes aqui e o resto fica a um clique em "Ver todas"
              — em vez de rolar dentro do card, ficando diferente do print.
              `overflow-y-auto` fica só como rede de segurança: com altura
              fixa (220px) e telas mais estreitas, 3 itens podem não caber
              exatamente — sem isso o 3º item ficava cortado no meio. */}
          <CardContent className={cn(isDashboard && 'flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar p-3 pt-0')}>
            {isLoadingPendencias ? (
              <div className="space-y-3">{Array(2).fill(0).map((_, i) => <CardSkeleton key={i} className="h-14 border-0 p-0" />)}</div>
            ) : pendencias && pendencias.length > 0 ? (
              // `justify-center` + `gap-2.5` (era `justify-between`, sem gap
              // fixo): antes os 3 itens grudavam no topo (colados no header)
              // e o `justify-between` jogava toda a folga da altura fixa do
              // card como vão entre eles. Centralizar o grupo distribui essa
              // folga também acima (afastando do título) e o gap fixo deixa
              // o espaço entre os itens menor e consistente.
              <div className={isDashboard ? 'flex flex-1 flex-col justify-center gap-2.5' : 'space-y-2'}>
                {(isDashboard ? pendencias.slice(0, 3) : pendencias).map((p, i) => (
                  <PendenciaItem
                    key={i}
                    pendencia={p}
                    index={i}
                    onClick={() => handleOpenDetail(p.tipo)}
                    variant={isDashboard ? 'dashboard' : 'default'}
                  />
                ))}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-success/20 to-finance/10 mb-3">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <p className="font-display font-medium">Tudo em dia!</p>
                <p className="text-caption text-muted-foreground font-body mt-1">Nenhuma pendência encontrada</p>
              </motion.div>
            )}
          </CardContent>
        </MotionCard>
      </div>

      {/* Modal de Detalhes de Pendências */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border-border/40 shadow-2xl glass">
          <DialogHeader className="p-5 pb-3 border-b border-border/10 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-display">
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
                      "rounded-lg px-4 font-medium transition-all text-xs whitespace-nowrap",
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

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-muted/5">
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
                                <h4 className="font-display font-medium text-sm leading-tight">{item.titulo}</h4>
                                <Badge className={cn("text-[10px] font-medium uppercase tracking-wider py-0.5", getPriorityColor(item.prioridade))}>
                                  {item.prioridade}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] opacity-70">
                                  {format(new Date(item.criado_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
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
                                  <div className="flex items-center gap-2.5">
                                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                                    <div>
                                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Timezone</p>
                                      <p className="text-xs font-medium text-foreground">{item.raw.relatorio_conformidade?.timezone || 'America/Sao_Paulo'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <History className="h-4 w-4 text-warning shrink-0" />
                                    <div>
                                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Hora Original</p>
                                      <p className="text-xs font-medium text-foreground">{item.raw.hora_original?.substring(0, 5) || 'Não registrada'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <Shield className="h-4 w-4 text-success shrink-0" />
                                    <div>
                                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Geofencing</p>
                                      <p className={cn("text-xs font-medium", item.raw.relatorio_conformidade?.geofencing ? "text-success" : "text-destructive")}>
                                        {item.raw.relatorio_conformidade?.geofencing ? 'Dentro do Perímetro' : 'Fora do Perímetro'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="history" className="mt-0">
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/10">
                                  <div className="flex items-center justify-between text-[10px] mb-3 pb-2 border-b border-border/5">
                                    <span className="font-medium text-muted-foreground uppercase">Campo</span>
                                    <span className="font-medium text-muted-foreground uppercase text-right">Comparação (De → Para)</span>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-muted-foreground">Hora do Ponto</span>
                                      <span className="font-medium">
                                        <span className="text-destructive line-through opacity-70 mr-2">{item.raw.hora_original?.substring(0, 5) || '--:--'}</span>
                                        <ChevronRight className="h-3 w-3 inline text-muted-foreground mx-1" />
                                        <span className="text-success font-medium ml-1">{item.raw.hora_sugerida?.substring(0, 5)}</span>
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
                <div className="p-4 rounded-3xl bg-muted/20 mb-4 border border-border/10">
                  <X className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <h3 className="text-sm font-display font-medium">Nenhuma pendência</h3>
                <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
                  Não encontramos itens que correspondam à sua busca ou filtro.
                </p>
                <Button variant="outline" size="sm" className="mt-6 rounded-xl px-4" onClick={() => { setSearchQuery(""); setFilterType("all"); }}>
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="p-5 border-t border-border/10 bg-muted/5">
            <Button variant="outline" size="sm" className="rounded-xl px-4" onClick={() => setIsDetailOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Central de Notificações Modal */}
      <Dialog open={isNotifOpen} onOpenChange={setIsNotifOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0 rounded-2xl border-border/40 shadow-2xl glass">
          <DialogHeader className="p-5 pb-3 border-b border-border/10">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-display">Central de Notificações</DialogTitle>
                <DialogDescription>Histórico de aprovações e ações do sistema.</DialogDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">Marcar todas como lidas</Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-5 bg-muted/5">
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
                          <h4 className="font-medium text-sm">{n.titulo}</h4>
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
