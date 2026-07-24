import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts';
import { useDebounce } from '@/hooks/useDebounce';
import { maskCpfDisplay } from '@/utils/piiMask';
import { secureJsonParse } from '@/utils/secureJson';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ColaboradorStatus } from '@/components/ui/status-badge';
import {
  Home, Users, Building2, FileText, Calendar,
  Clock, Gift, BarChart3, Settings, FileCheck,
  Search, UserPlus, DollarSign, ArrowRight,
  Zap, Calculator, Plus, User, Briefcase,
  FolderOpen, Network, Shield, UserCog, Plug, Database,
  CalendarDays, UserMinus, Scale, TrendingUp
} from 'lucide-react';

/* ─── Types ─── */
interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  category: 'navigation' | 'action' | 'pessoa' | 'empresa';
  path?: string;
  action?: () => void;
  gradient: string;
  shortcut?: string;
  avatar?: { name: string };
  status?: string;
}

/* ─── Static commands ─── */
const staticCommands: CommandItem[] = [
  // Navigation
  { id: 'dashboard', label: 'Dashboard', description: 'Visão geral do sistema', icon: Home, category: 'navigation', path: '/dashboard', gradient: 'from-primary to-primary-glow' },
  { id: 'colaboradores', label: 'Colaboradores', description: 'Gestão de funcionários', icon: Users, category: 'navigation', path: '/colaboradores', gradient: 'from-primary to-primary-glow' },
  { id: 'empresas', label: 'Empresas', description: 'Cadastro de empresas', icon: Building2, category: 'navigation', path: '/empresas', gradient: 'from-primary/80 to-primary' },
  { id: 'admissoes', label: 'Admissões', description: 'Novos colaboradores', icon: UserPlus, category: 'navigation', path: '/admissoes', gradient: 'from-primary to-primary-glow' },
  { id: 'desligamentos', label: 'Desligamentos', description: 'Saídas de colaboradores', icon: UserMinus, category: 'navigation', path: '/desligamentos', gradient: 'from-primary/60 to-primary/90' },
  { id: 'folha', label: 'Folha de Pagamento', description: 'Cálculos e holerites', icon: FileText, category: 'navigation', path: '/folha', gradient: 'from-primary-glow to-primary' },
  { id: 'ferias', label: 'Férias', description: 'Programação de férias', icon: Calendar, category: 'navigation', path: '/ferias', gradient: 'from-primary-glow to-primary' },
  { id: 'ponto', label: 'Ponto Eletrônico', description: 'Registro e espelho', icon: Clock, category: 'navigation', path: '/ponto', gradient: 'from-primary/60 to-primary/90' },
  { id: 'afastamentos', label: 'Afastamentos', description: 'Licenças e afastamentos', icon: Shield, category: 'navigation', path: '/afastamentos', gradient: 'from-primary/80 to-primary' },
  { id: 'beneficios', label: 'Benefícios', description: 'Gestão de benefícios', icon: Gift, category: 'navigation', path: '/beneficios', gradient: 'from-primary to-primary-glow' },
  { id: 'cargos', label: 'Cargos', description: 'Cargos e salários', icon: Briefcase, category: 'navigation', path: '/cargos', gradient: 'from-primary/80 to-primary' },
  { id: 'departamentos', label: 'Departamentos', description: 'Estrutura organizacional', icon: Building2, category: 'navigation', path: '/departamentos', gradient: 'from-primary/60 to-primary/90' },
  { id: 'documentos', label: 'Documentos', description: 'Gestão de documentos', icon: FolderOpen, category: 'navigation', path: '/documentos', gradient: 'from-primary-glow to-primary' },
  { id: 'feriados', label: 'Feriados', description: 'Calendário de feriados', icon: CalendarDays, category: 'navigation', path: '/feriados', gradient: 'from-primary to-primary-glow' },
  { id: 'organograma', label: 'Organograma', description: 'Hierarquia organizacional', icon: Network, category: 'navigation', path: '/organograma', gradient: 'from-primary/80 to-primary' },
  { id: 'relatorios', label: 'Relatórios', description: 'Relatórios e exportações', icon: BarChart3, category: 'navigation', path: '/relatorios', gradient: 'from-primary to-primary-glow' },
  { id: 'passivo-trabalhista', label: 'Passivo Trabalhista', description: 'Análise de riscos e provisões', icon: Scale, category: 'navigation', path: '/passivo-trabalhista', gradient: 'from-destructive to-destructive/80' },
  { id: 'dashboard-executivo', label: 'Dashboard Executivo', description: 'KPIs estratégicos para gestão', icon: TrendingUp, category: 'navigation', path: '/dashboard-executivo', gradient: 'from-success to-success/80' },
  { id: 'esocial', label: 'eSocial', description: 'Eventos e transmissão', icon: FileCheck, category: 'navigation', path: '/esocial', gradient: 'from-primary to-primary-glow' },
  { id: 'auditoria', label: 'Auditoria', description: 'Logs e rastreamento', icon: Shield, category: 'navigation', path: '/auditoria', gradient: 'from-primary/60 to-primary/90' },
  { id: 'usuarios', label: 'Usuários', description: 'Gerenciar usuários', icon: UserCog, category: 'navigation', path: '/usuarios', gradient: 'from-primary/80 to-primary' },
  { id: 'integracoes', label: 'Integrações', description: 'APIs e webhooks', icon: Plug, category: 'navigation', path: '/integracoes', gradient: 'from-primary to-primary-glow' },
  { id: 'backup', label: 'Backup', description: 'Cópia de segurança', icon: Database, category: 'navigation', path: '/backup', gradient: 'from-primary/60 to-primary/90' },
  { id: 'configuracoes', label: 'Configurações', description: 'Preferências do sistema', icon: Settings, category: 'navigation', path: '/configuracoes', gradient: 'from-muted-foreground to-foreground' },
  // Actions
  { id: 'novo-colaborador', label: 'Novo Colaborador', description: 'Cadastrar funcionário', icon: UserPlus, category: 'action', path: '/colaboradores/novo', gradient: 'from-primary to-primary-glow', shortcut: 'N' },
  { id: 'calcular-folha', label: 'Calcular Folha', description: 'Processar folha do mês', icon: Calculator, category: 'action', path: '/folha/calcular', gradient: 'from-primary-glow to-primary', shortcut: 'F' },
  { id: 'nova-empresa', label: 'Nova Empresa', description: 'Cadastrar empresa', icon: Plus, category: 'action', path: '/empresas/nova', gradient: 'from-primary/80 to-primary' },
  { id: 'novo-beneficio', label: 'Novo Benefício', description: 'Adicionar benefício', icon: Gift, category: 'action', path: '/beneficios/novo', gradient: 'from-primary to-primary-glow' },
];

/* ─── Fuzzy match ─── */
function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  // Direct includes
  if (t.includes(q)) return true;
  // Fuzzy: all chars in order
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti);
    if (found === -1) return false;
    ti = found + 1;
  }
  return true;
}

/* ─── Recent searches ─── */
function getRecentSearches(): string[] {
  try {
    return secureJsonParse<string[]>(localStorage.getItem('cmd-recent') || '[]').slice(0, 5);
  } catch { return []; }
}

function addRecentSearch(term: string) {
  if (!term || term.length < 2) return;
  const recent = getRecentSearches().filter(s => s !== term);
  recent.unshift(term);
  localStorage.setItem('cmd-recent', JSON.stringify(recent.slice(0, 5)));
}

/* ─── Component ─── */
export function CommandPalette({ 
  open: externalOpen, 
  onOpenChange: setExternalOpen 
}: { 
  open?: boolean; 
  onOpenChange?: (open: boolean) => void 
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;
  
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { empresaAtual } = useEmpresa();

  // Search colaboradores from DB
  const { data: dbColaboradores } = useQuery({
    queryKey: ['cmd-colaboradores', empresaAtual?.id, debouncedQuery],
    enabled: open && debouncedQuery.length >= 2 && !!empresaAtual?.id,
    queryFn: async () => {
      const q = debouncedQuery.trim();
      let queryBuilder = supabase
        .from('colaboradores')
        .select('id, nome_completo, cpf, cargo, status')
        .eq('empresa_id', empresaAtual!.id)
        .limit(5);

      // Search by CPF if query looks like numbers
      if (/^\d+$/.test(q)) {
        queryBuilder = queryBuilder.ilike('cpf', `%${q}%`);
      } else {
        queryBuilder = queryBuilder.ilike('nome_completo', `%${q}%`);
      }

      const { data } = await queryBuilder;
      return data || [];
    },
    staleTime: 10_000,
  });

  // Search empresas from DB (filtered by user's empresas via RLS)
  const { data: dbEmpresas } = useQuery({
    queryKey: ['cmd-empresas', debouncedQuery],
    enabled: open && debouncedQuery.length >= 2,
    queryFn: async () => {
      const q = debouncedQuery.trim();
      let queryBuilder = supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia, cnpj')
        .eq('ativa', true)
        .limit(5);

      const sq = q.replace(/[%_.,()]/g, '');
      if (/^\d+$/.test(sq)) {
        queryBuilder = queryBuilder.ilike('cnpj', `%${sq}%`);
      } else if (sq) {
        queryBuilder = queryBuilder.or(`razao_social.ilike.%${sq}%,nome_fantasia.ilike.%${sq}%`);
      }

      const { data } = await queryBuilder;
      return data || [];
    },
    staleTime: 10_000,
  });

  // ⌘K / Ctrl+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
        setQuery('');
        setSelectedIndex(0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build dynamic items from DB results
  const dynamicItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    dbColaboradores?.forEach(c => {
      items.push({
        id: `colab-${c.id}`,
        label: c.nome_completo,
        description: `${c.cpf ? maskCpfDisplay(c.cpf) : ''} · ${c.cargo || ''}`,
        status: c.status,
        icon: User,
        category: 'pessoa',
        path: `/colaboradores/${c.id}`,
        gradient: 'from-primary to-primary-glow',
        avatar: { name: c.nome_completo },
      });
    });

    dbEmpresas?.forEach(e => {
      items.push({
        id: `emp-${e.id}`,
        label: e.nome_fantasia || e.razao_social,
        description: e.cnpj || e.razao_social,
        icon: Building2,
        category: 'empresa',
        path: `/empresas/${e.id}/editar`,
        gradient: 'from-primary/80 to-primary',
      });
    });

    return items;
  }, [dbColaboradores, dbEmpresas]);

  // Filter static commands
  const filteredStatic = useMemo(() => {
    if (!query) return staticCommands;
    return staticCommands.filter(c =>
      fuzzyMatch(c.label, query) || (c.description && fuzzyMatch(c.description, query))
    );
  }, [query]);

  // Group all results
  const grouped = useMemo(() => ({
    pessoas: dynamicItems.filter(c => c.category === 'pessoa'),
    empresas: dynamicItems.filter(c => c.category === 'empresa'),
    navigation: filteredStatic.filter(c => c.category === 'navigation').slice(0, query ? 6 : 8),
    action: filteredStatic.filter(c => c.category === 'action'),
  }), [dynamicItems, filteredStatic, query]);

  const allItems = useMemo(() => [
    ...grouped.pessoas,
    ...grouped.empresas,
    ...grouped.navigation,
    ...grouped.action,
  ], [grouped]);

  const execute = useCallback((item: CommandItem) => {
    if (query) addRecentSearch(query);
    if (item.path) navigate(item.path);
    if (item.action) item.action();
    setOpen(false);
    setQuery('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, query]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && allItems[selectedIndex]) {
        e.preventDefault();
        execute(allItems[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, selectedIndex, allItems, execute]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSelectedIndex(0); }, [query]);

  /* ─── Render group helper ─── */
  let globalIndex = -1;
  function renderGroup(title: string, items: CommandItem[]) {
    if (items.length === 0) return null;
    return (
      <>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 font-body">
          {title}
          <span className="ml-1.5 text-muted-foreground/40">{items.length}</span>
        </p>
        {items.map(item => {
          globalIndex++;
          const idx = globalIndex;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => execute(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group',
                selectedIndex === idx
                  ? 'bg-accent/80 shadow-xs'
                  : 'hover:bg-accent/40'
              )}
            >
              {item.avatar ? (
                <UserAvatar name={item.avatar.name} size="sm" />
              ) : (
                <div className={cn('p-2 rounded-lg bg-gradient-to-br transition-transform group-hover:scale-110', item.gradient)}>
                  <Icon className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium font-body">{item.label}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground font-body truncate">{item.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {item.status && (
                  <div className="hidden sm:block scale-75 origin-right">
                    <ColaboradorStatus status={item.status} />
                  </div>
                )}
                {item.shortcut && (
                  <kbd className="h-5 min-w-[20px] inline-flex items-center justify-center rounded border border-border/50 bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
                    {item.shortcut}
                  </kbd>
                )}
                <ArrowRight className={cn(
                  'h-4 w-4 text-muted-foreground transition-all',
                  selectedIndex === idx ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'
                )} />
              </div>
            </button>
          );
        })}
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 glass border-border/50 overflow-hidden rounded-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border/30">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nome, CPF, CNPJ, páginas..."
            className="flex-1 h-14 bg-transparent border-none outline-hidden text-base font-body placeholder:text-muted-foreground/50"
          />
          <kbd className="hidden sm:inline-flex h-6 items-center rounded border border-border/50 bg-muted px-2 text-[11px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2 no-scrollbar">
          <AnimatePresence mode="wait">
            {allItems.length === 0 && !query ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 font-body">Buscas Recentes</p>
                {getRecentSearches().length > 0 ? (
                  getRecentSearches().map((term, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(term)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-accent/40 group transition-all"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      <span className="text-sm font-body">{term}</span>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Zap className="h-10 w-10 text-muted-foreground/20 mb-3" />
                    <p className="text-xs text-muted-foreground font-body">Use ⌘K para encontrar pessoas e ferramentas rapidamente</p>
                  </div>
                )}
              </motion.div>
            ) : allItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="p-3 rounded-2xl bg-muted/50 mb-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-body">
                  Nenhum resultado para "<span className="text-foreground font-medium">{query}</span>"
                </p>
                <p className="text-xs text-muted-foreground/60 font-body mt-1">
                  Tente buscar por nome, CPF ou CNPJ
                </p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                {renderGroup('Pessoas', grouped.pessoas)}
                {renderGroup('Empresas', grouped.empresas)}
                {renderGroup('Páginas', grouped.navigation)}
                {renderGroup('Ações Rápidas', grouped.action)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 bg-muted/30">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-body">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-border/50 bg-muted text-[10px]">↑↓</kbd> navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-border/50 bg-muted text-[10px]">↵</kbd> selecionar
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" />
            <span className="font-body">Busca Inteligente</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
