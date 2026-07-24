import { 
  LayoutDashboard, Users, UserPlus, Clock, Umbrella, Heart, Wallet, Gift,
  UserMinus, BarChart3, ChevronLeft, ChevronRight, ChevronDown, Search,
  LogOut, History, Calendar, Building2, Shield, PenTool, UserCircle,
  Network, ClipboardList, FileCheck, Calculator, Settings, Briefcase,
  FileText, GraduationCap, Target, UserSearch, LucideIcon, MapPin, Timer,
  Megaphone, Receipt, GitBranch, CalendarClock, Fingerprint, ShieldCheck, Scale, Bot, Landmark, BookOpen, TrendingDown,
  Trophy, MessageSquareText, Activity, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, memo, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/hooks/useAuth';
import { usePWA } from '@/hooks/usePWA';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { EmpresaSelector } from '@/components/empresa/EmpresaSelector';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { DownloadCloud } from 'lucide-react';

interface MenuItem { icon: LucideIcon; label: string; path: string; color: string; }
interface MenuGroup { id: string; label: string; icon: LucideIcon; color: string; items: MenuItem[]; }

const menuGroups: MenuGroup[] = [
  {
    id: 'principal',
    label: 'Principal',
    icon: LayoutDashboard,
    color: 'text-primary',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', color: 'text-primary' },
      { icon: BarChart3, label: 'Dashboard Executivo', path: '/dashboard-executivo', color: 'text-success' },
      { icon: Scale, label: 'Passivo Trabalhista', path: '/passivo-trabalhista', color: 'text-destructive' },
      { icon: Users, label: 'Colaboradores', path: '/colaboradores', color: 'text-info' },
      { icon: Network, label: 'Organograma', path: '/organograma', color: 'text-info' },
      { icon: Bot, label: 'Assistente IA', path: '/assistente-ia', color: 'text-primary' },
    ]
  },
  {
    id: 'gestao-pessoas',
    label: 'Gestão de Pessoas',
    icon: Briefcase,
    color: 'text-success',
    items: [
      { icon: UserPlus, label: 'Admissões', path: '/admissoes', color: 'text-success' },
      { icon: UserPlus, label: 'Onboarding', path: '/onboarding', color: 'text-info' },
      { icon: UserMinus, label: 'Desligamentos', path: '/desligamentos', color: 'text-destructive' },
      { icon: Target, label: 'Avaliação & Performance', path: '/avaliacao', color: 'text-warning' },
      { icon: Trophy, label: 'Premiações 10/10', path: '/premiacoes', color: 'text-primary' },

      { icon: GraduationCap, label: 'Treinamentos', path: '/treinamentos', color: 'text-info' },
      { icon: UserSearch, label: 'Recrutamento', path: '/recrutamento', color: 'text-success' },
      { icon: ClipboardList, label: 'Pesquisas Clima', path: '/pesquisas-clima', color: 'text-info' },
    ]
  },
  {
    id: 'tempo-ausencias',
    label: 'Tempo & Ausências',
    icon: Clock,
    color: 'text-info',
    items: [
      { icon: Clock, label: 'Ponto', path: '/ponto', color: 'text-info' },
      { icon: Timer, label: 'Horas Extras', path: '/horas-extras', color: 'text-warning' },
      { icon: Scale, label: 'Banco de Horas', path: '/banco-horas', color: 'text-info' },
      { icon: CalendarClock, label: 'Turnos & Escalas', path: '/turnos', color: 'text-primary' },
      { icon: Umbrella, label: 'Férias', path: '/ferias', color: 'text-warning' },
      { icon: Heart, label: 'Afastamentos', path: '/afastamentos', color: 'text-destructive' },
      { icon: Calendar, label: 'Feriados', path: '/feriados', color: 'text-warning' },
      { icon: Fingerprint, label: 'Controle Acesso', path: '/controle-acesso', color: 'text-primary' },
    ]
  },
  {
    id: 'remuneracao',
    label: 'Remuneração',
    icon: Wallet,
    color: 'text-success',
    items: [
      { icon: Wallet, label: 'Folha de Pagamento', path: '/folha', color: 'text-success' },
      { icon: Gift, label: 'Benefícios', path: '/beneficios', color: 'text-warning' },
      { icon: TrendingDown, label: 'Descontos & Consignados', path: '/descontos', color: 'text-destructive' },
      { icon: Receipt, label: 'Despesas', path: '/despesas', color: 'text-destructive' },
      { icon: Landmark, label: 'Bancário (CNAB/Pix)', path: '/financeiro-bancario', color: 'text-info' },
      { icon: BookOpen, label: 'Contabilidade', path: '/contabilidade', color: 'text-primary' },
      { icon: BookOpen, label: 'Canal Contabilidade', path: '/contabilidade/canal', color: 'text-primary' },
    ]
  },
  {
    id: 'estrutura',
    label: 'Estrutura',
    icon: Building2,
    color: 'text-info',
    items: [
      { icon: Building2, label: 'Empresas', path: '/empresas', color: 'text-info' },
      { icon: Briefcase, label: 'Cargos', path: '/cargos', color: 'text-warning' },
      { icon: Building2, label: 'Departamentos', path: '/departamentos', color: 'text-info' },
      { icon: MapPin, label: 'Locais de Trabalho', path: '/locais-trabalho', color: 'text-success' },
    ]
  },
  {
    id: 'documentos',
    label: 'Documentos & Compliance',
    icon: FileText,
    color: 'text-warning',
    items: [
      { icon: FileCheck, label: 'Documentos', path: '/documentos', color: 'text-warning' },
      { icon: FileText, label: 'Gerador Docs', path: '/gerador-documentos', color: 'text-info' },
      { icon: PenTool, label: 'Assinaturas', path: '/assinaturas', color: 'text-primary' },
      { icon: FileCheck, label: 'eSocial', path: '/esocial', color: 'text-success' },
      { icon: History, label: 'Auditoria', path: '/auditoria', color: 'text-primary' },
      { icon: ShieldCheck, label: 'LGPD', path: '/lgpd', color: 'text-primary' },
    ]
  },
  {
    id: 'sst',
    label: 'SST / Saúde Ocupacional',
    icon: ShieldCheck,
    color: 'text-success',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard SST', path: '/admin/sst/dashboard', color: 'text-success' },
      { icon: Shield, label: 'Visão Geral SST', path: '/sst', color: 'text-success' },
      { icon: Building2, label: 'Clínicas Parceiras', path: '/admin/sst/clinicas', color: 'text-info' },
      { icon: CalendarClock, label: 'Agendamento de Exames', path: '/admin/sst/agendamentos', color: 'text-info' },
      { icon: FileCheck, label: 'ASO Workflow', path: '/admin/sst/aso', color: 'text-primary' },
      { icon: Fingerprint, label: 'Fichas de EPI', path: '/admin/sst/epis', color: 'text-warning' },
      { icon: ShieldAlert, label: 'Extintores (NR-23)', path: '/admin/sst/extintores', color: 'text-destructive' },
      { icon: FileText, label: 'CAT Eletrônica', path: '/admin/sst/cat', color: 'text-warning' },
      { icon: ClipboardList, label: 'Regimento Interno', path: '/admin/sst/regimento', color: 'text-primary' },
    ]
  },
  {
    id: 'administracao',
    label: 'Administração',
    icon: Settings,
    color: 'text-muted-foreground',
    items: [
      { icon: BarChart3, label: 'Relatórios', path: '/relatorios', color: 'text-info' },
      { icon: GitBranch, label: 'Workflows', path: '/workflows', color: 'text-info' },
      { icon: Shield, label: 'SST', path: '/sst', color: 'text-success' },
      { icon: Calculator, label: 'Rescisão', path: '/calculadora-rescisao', color: 'text-warning' },
      { icon: Users, label: 'Importação', path: '/importacao', color: 'text-info' },
      { icon: Megaphone, label: 'Comunicação', path: '/comunicacao-interna', color: 'text-warning' },
      { icon: Shield, label: 'Usuários', path: '/usuarios', color: 'text-warning' },
      { icon: Settings, label: 'Configurações', path: '/configuracoes', color: 'text-muted-foreground' },
      { icon: Gift, label: 'Promo Brindes', path: '/promo-brindes', color: 'text-warning' },
      { icon: GitBranch, label: 'Vínculos Promo', path: '/promo-brindes/vinculos', color: 'text-info' },
      { icon: ClipboardList, label: 'Integrações', path: '/integracoes', color: 'text-info' },
      { icon: Activity, label: 'Telemetria', path: '/admin/telemetria', color: 'text-primary' },
      { icon: ShieldCheck, label: 'Idempotência', path: '/admin/idempotencia', color: 'text-success' },
      { icon: Activity, label: 'Operação (Painel)', path: '/admin/operacao', color: 'text-primary' },
      { icon: ShieldAlert, label: 'Segurança (Alertas)', path: '/admin/security', color: 'text-destructive' },
    ]
  },
];

const portalItem: MenuItem = { icon: UserCircle, label: 'Meu Portal', path: '/portal', color: 'text-success' };

interface AppSidebarProps { onSearchOpen?: () => void; }

const SidebarMenuItem = memo(function SidebarMenuItem({ item, isActive, collapsed }: { item: MenuItem; isActive: boolean; collapsed: boolean; }) {
  const queryClient = useQueryClient();
  
  const handleMouseEnter = useCallback(() => {
    // Prefetching logic based on path
    const key = item.path.split('/')[1];
    if (key === 'dashboard') {
      queryClient.prefetchQuery({ queryKey: ['dashboard-stats'] });
    } else if (key === 'colaboradores' && !item.path.includes('novo')) {
      queryClient.prefetchQuery({ queryKey: ['colaboradores'] });
    }
  }, [item.path, queryClient]);

  const content = (
    <NavLink
      to={item.path}
      onMouseEnter={handleMouseEnter}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <item.icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? item.color : "text-sidebar-foreground group-hover:" + item.color)} />
      {!collapsed && (
        <>
          <span className="text-sm font-medium truncate flex-1">{item.label}</span>
          {item.path === '/colaboradores' && <ColaboradoresCount />}
          {item.path === '/admin/security' && <SecurityAlertsCount />}
          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
        </>
      )}
    </NavLink>
  );
  if (collapsed) {
    return (<Tooltip delayDuration={0}><TooltipTrigger asChild>{content}</TooltipTrigger><TooltipContent side="right" className="font-medium">{item.label}</TooltipContent></Tooltip>);
  }
  return content;
});

const SidebarMenuGroup = memo(function SidebarMenuGroup({ group, collapsed, currentPath, isOpen, onToggle }: { group: MenuGroup; collapsed: boolean; currentPath: string; isOpen: boolean; onToggle: () => void; }) {
  const hasActiveItem = group.items.some(item => currentPath.startsWith(item.path));
  const GroupIcon = group.icon;

  if (collapsed) {
    return (<div className="space-y-1">{group.items.map((item) => (<SidebarMenuItem key={item.path} item={item} isActive={currentPath.startsWith(item.path)} collapsed={collapsed} />))}</div>);
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className={cn("flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200 group", "text-sidebar-foreground hover:bg-sidebar-accent/30", hasActiveItem && "bg-sidebar-accent/20")}>
          <GroupIcon className={cn("w-4 h-4 shrink-0 transition-colors", hasActiveItem ? group.color : "text-sidebar-foreground/70")} />
          <span className={cn("text-xs font-semibold uppercase tracking-wider flex-1 text-left", hasActiveItem ? "text-sidebar-foreground" : "text-sidebar-foreground/70")}>{group.label}</span>
          <ChevronDown className={cn("w-4 h-4 text-sidebar-foreground/50 transition-transform duration-200", isOpen && "rotate-180")} />
          {hasActiveItem && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 space-y-0.5 mt-1 animate-accordion-down">
        {group.items.map((item) => (<SidebarMenuItem key={item.path} item={item} isActive={currentPath.startsWith(item.path)} collapsed={false} />))}
      </CollapsibleContent>
    </Collapsible>
  );
});

const ColaboradoresCount = memo(function ColaboradoresCount() {
  const { data: count, isLoading } = useQuery({
    queryKey: ['sidebar-colaboradores-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('colaboradores')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');
      return count || 0;
    },
    staleTime: 60000,
  });

  if (isLoading || !count) return null;

  return (
    <span className="ml-auto bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-primary/20">
      {count}
    </span>
  );
});

const SecurityAlertsCount = memo(function SecurityAlertsCount() {
  const queryClient = useQueryClient();
  const queryKey = ['sidebar-security-alerts-count'];

  const { data: count } = useQuery({
    queryKey,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('security_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);
      if (error) return 0; // RLS/permissão → some silenciosamente
      return count || 0;
    },
    staleTime: 30_000,
    refetchInterval: 60_000, // fallback caso realtime caia
    retry: false,
  });

  // Realtime: invalida contador e página de alertas ao detectar mudança
  useEffect(() => {
    const channel = supabase
      .channel(`sidebar-security-alerts-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'security_alerts' },
        () => {
          queryClient.invalidateQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: ['admin-security-alerts'] });
          queryClient.invalidateQueries({ queryKey: ['security_alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  if (!count) return null;

  return (
    <span className="ml-auto bg-destructive/10 text-destructive text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-destructive/30 animate-pulse">
      {count > 99 ? '99+' : count}
    </span>
  );
});


const SystemStatus = memo(function SystemStatus({ collapsed }: { collapsed: boolean }) {
  const { data: isHealthy, isLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      try {
        await edgeFunctionsService.checkExternalDb();
        return true;
      } catch (e) {
        return false;
      }
    },
    refetchInterval: 60000, // Cada 1 minuto
  });

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className={cn("w-2 h-2 rounded-full", isLoading ? "bg-muted animate-pulse" : isHealthy ? "bg-success" : "bg-destructive")} />
        </TooltipTrigger>
        <TooltipContent side="right">
          {isLoading ? "Verificando..." : isHealthy ? "Sistema Online" : "Problemas na Conexão"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/10 border border-sidebar-border/30">
      <div className={cn("w-1.5 h-1.5 rounded-full", isLoading ? "bg-muted animate-pulse" : isHealthy ? "bg-success" : "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {isLoading ? "Verificando..." : isHealthy ? "Sistemas Online" : "Erro de Conexão"}
      </span>
    </div>
  );
});

export function AppSidebar({ onSearchOpen }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuGroups.forEach(group => { initial[group.id] = true; });
    return initial;
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isInstallable, installApp } = usePWA();

  const handleLogout = async () => { 
    try {
      await signOut(); 
      toast.success('Logout realizado com sucesso'); 
      navigate('/login'); 
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro ao encerrar sessão.'));
    }
  };

  const toggleGroup = useCallback((groupId: string) => { setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] })); }, []);
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const currentPath = location.pathname;

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn("h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out", collapsed ? "w-16" : "w-64")}>
        {/* Header */}
        <div className="p-3 border-b border-sidebar-border flex flex-col gap-2">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-md">
                  <Users className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-foreground text-sm">TIME | PROMO BRINDES</h1>
                  <p className="text-[10px] text-muted-foreground">Sistema de Gestão de Pessoas</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-0.5">
              {!collapsed && <NotificationBell />}
              {!collapsed && <ThemeToggle />}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                className="h-8 w-8 hover:bg-sidebar-accent"
                aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                aria-expanded={!collapsed}
                title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" aria-hidden />}
              </Button>
            </div>
          </div>
          {!collapsed && <div className="pt-1"><EmpresaSelector /></div>}
        </div>

        {/* Search */}
        <div className="px-2 py-2">
          <Button variant="outline" className={cn("w-full justify-start gap-2 text-muted-foreground hover:text-foreground bg-sidebar-accent/30 border-sidebar-border", collapsed && "justify-center px-0")} onClick={onSearchOpen}>
            <Search className="h-4 w-4 shrink-0" />
            {!collapsed && (<><span className="flex-1 text-left text-sm">Buscar...</span><kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground"><span className="text-xs">⌘</span>K</kbd></>)}
          </Button>
        </div>

        {/* Portal */}
        <div className="px-2 pb-2">
          <SidebarMenuItem item={portalItem} isActive={currentPath === portalItem.path} collapsed={collapsed} />
        </div>
        <div className="mx-3 h-px bg-sidebar-border" />

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin">
          {menuGroups.map((group) => (
            <SidebarMenuGroup key={group.id} group={group} collapsed={collapsed} currentPath={currentPath} isOpen={openGroups[group.id] ?? true} onToggle={() => toggleGroup(group.id)} />
          ))}
        </nav>

        <div className="px-3 py-2 space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => toast.info('Abertura de ticket de suporte...')}
            className={cn(
              "w-full gap-2 text-muted-foreground hover:text-primary rounded-xl",
              collapsed && "px-0 justify-center"
            )}
          >
            <MessageSquareText className="h-4 w-4" />
            {!collapsed && "Dar Feedback"}
          </Button>
          {isInstallable && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={installApp} 
              className={cn(
                "w-full mb-2 gap-2 border-primary/30 text-primary hover:bg-primary/10 rounded-xl",
                collapsed && "px-0 justify-center"
              )}
            >
              <DownloadCloud className="h-4 w-4" />
              {!collapsed && "Instalar App"}
            </Button>
          )}
          <SystemStatus collapsed={collapsed} />
        </div>

        {/* Footer */}
        <div className={cn("border-t border-sidebar-border transition-all duration-200", collapsed ? "p-2" : "p-3")}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <NavLink to="/perfil" className={cn("w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center transition-colors", location.pathname === '/perfil' && "ring-2 ring-primary")}>
                    <span className="text-xs font-semibold text-primary">{user?.name ? getInitials(user.name) : '??'}</span>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">{user?.name || user?.email || 'Perfil'}</TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-2">
              <NavLink to="/perfil" className={cn("flex items-center gap-3 p-2 rounded-lg transition-colors", location.pathname === '/perfil' ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50")}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                  <span className="text-xs font-semibold text-primary">{user?.name ? getInitials(user.name) : '??'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user?.name || user?.email || 'Carregando...'}</p>
                  <p className="text-xs text-muted-foreground truncate">Usuário</p>
                </div>
              </NavLink>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />Sair do Sistema
              </Button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
