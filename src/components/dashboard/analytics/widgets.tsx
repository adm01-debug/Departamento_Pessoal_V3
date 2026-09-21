/**
 * Widgets auxiliares do AnalyticsSection.
 *
 * Extraídos do arquivo principal (`AnalyticsSection.tsx`) para reduzir o
 * tamanho do componente pai (>1200 LOC) e permitir teste/reuso isolado.
 *
 * Nenhuma lógica alterada — apenas movimentação estrutural.
 */
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Activity, AlertCircle, UserPlus, Briefcase,
  CheckCircle2, AlertTriangle, Calendar, ChevronRight,
  ShieldCheck, Clock, ExternalLink, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatedNumber } from '../AnimatedNumber';
import { CardSkeleton } from '@/components/ui/module-skeleton';
import { viewsService } from '@/services/tabelasComplementaresService';
import { useQuery } from '@tanstack/react-query';
// MOCK VISUAL — ver src/mocks/dashboardMockData.ts (só ativo em dev + VITE_DASHBOARD_MOCK=true).
import { isDashboardMockEnabled, mockAlertasRH } from '@/mocks/dashboardMockData';

// eslint-disable-next-line react-refresh/only-export-components
export const MotionCard = motion.create(Card);

// eslint-disable-next-line react-refresh/only-export-components
export const donutColors = [
  'hsl(var(--primary))',
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--xp))',
  'hsl(var(--streak))',
];

/** Indicador com barra animada — usado nos KPIs do dashboard. */
export function IndicatorRow({ label, value, maxValue = 10, suffix = '%', direction = 'lower-better' }: {
  label: string; value: number; maxValue?: number; suffix?: string;
  /**
   * `lower-better` (padrão) — Turnover/Absenteísmo: valor alto vira vermelho.
   * `higher-better` — Headcount: é só uma contagem, sem limiar de risco; a
   * heurística "quanto maior, pior" pintava a barra de vermelho mesmo com a
   * empresa crescendo, porque `maxValue` é sempre proporcional ao próprio
   * valor (`headcount*1.2`), deixando-a fixa acima do limiar de alerta.
   */
  direction?: 'lower-better' | 'higher-better';
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const getColor = () => {
    if (direction === 'higher-better') return 'from-primary to-primary-glow';
    if (value >= maxValue * 0.8) return 'from-destructive to-destructive/70';
    if (value >= maxValue * 0.5) return 'from-primary-glow to-primary';
    return 'from-primary to-primary-glow';
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        {/* Label discreto, número protagonista — mesma lógica de hierarquia
            aplicada nos KPIs e nos demais cards do dashboard. */}
        <span className="text-caption font-body text-muted-foreground">{label}</span>
        <span className="text-h3 font-display">{value.toFixed(1)}{suffix}</span>
      </div>
      <div className="h-2.5 bg-muted/80 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] as const, delay: 0.3 }}
          className={cn('h-full rounded-full bg-gradient-to-r shadow-xs', getColor())}
        />
      </div>
    </div>
  );
}

/** Cartão numérico compacto com ícone gradiente. */
export function QuickStat({ label, value, icon: Icon, gradient, index = 0, compact = false }: {
  label: string; value: number; icon: React.ElementType; gradient: string; index?: number;
  /** Altura reduzida, para as faixas de viewport fixa do Dashboard. */
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'flex items-center rounded-xl glass hover:border-border/60 transition-all group',
        compact ? 'gap-3 p-3' : 'gap-3.5 p-3.5',
      )}
    >
      <div className={cn(
        'rounded-lg bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform',
        gradient,
        compact ? 'p-2' : 'p-2.5',
      )}>
        <Icon className={cn('text-primary-foreground', compact ? 'h-4 w-4' : 'h-4 w-4')} />
      </div>
      <div className="min-w-0">
        <p className={cn('font-display font-medium', compact ? 'text-h3' : 'text-h2')}>
          <AnimatedNumber value={value} />
        </p>
        {/* `text-muted-foreground` fora do `cn()`: combinado com `text-overline` na
            mesma chamada, o tailwind-merge descartava a cor (mesmo conflito
            corrigido em SystemStatusCard). */}
        <p className={`text-muted-foreground font-body truncate ${compact ? 'text-overline normal-case tracking-normal mt-1' : 'text-caption'}`}>{label}</p>
      </div>
    </motion.div>
  );
}

/**
 * Mini-cartão vertical (ícone → valor → rótulo) para grids de 3 colunas —
 * usado em "Movimentação" no Dashboard, no padrão do preview de referência:
 * cada estatística é um tile com borda/fundo/padding próprios, não um item
 * solto flutuando ao lado dos outros dois.
 */
export function MiniStat({ label, value, icon: Icon, tone, index = 0, deltaPct, deltaDirection = 'higher-better', compact = false }: {
  label: string; value: number; icon: React.ElementType; tone: string; index?: number;
  /**
   * Variação percentual frente ao período anterior, quando calculável a
   * partir da própria série já carregada (ex.: mês atual vs. mês anterior
   * dentro do intervalo selecionado) — não é uma métrica nova, só o mesmo
   * dado exibido também como tendência. Omitido quando não há base de
   * comparação (ex.: só um mês no período).
   */
  deltaPct?: number;
  /** Mesma semântica de `IndicatorRow.direction`: para métricas onde subir é ruim (ex.: desligamentos), inverte as cores. */
  deltaDirection?: 'higher-better' | 'lower-better';
  /** Versão mais densa — ícone, número e paddings menores, para faixas com pouca altura disponível. */
  compact?: boolean;
}) {
  const deltaIsGood = deltaPct !== undefined && (deltaDirection === 'higher-better' ? deltaPct >= 0 : deltaPct <= 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'flex h-full flex-col items-center justify-center rounded-lg border border-border/50 bg-muted/20 text-center',
        compact ? 'gap-0.5 p-1' : 'gap-1.5 p-2',
      )}
    >
      <div className={cn('grid shrink-0 place-items-center rounded-full', tone, compact ? 'h-5 w-5' : 'h-8 w-8')}>
        <Icon className={compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
      </div>
      {/* `.text-data` (Nível 2, 24px/700) — era `text-xl` (20px) isolado. */}
      <p className={compact ? 'text-base font-display font-bold leading-none' : 'text-data'}>
        <AnimatedNumber value={value} />
      </p>
      <p className={cn('text-muted-foreground', compact ? 'text-[10px] leading-tight' : 'text-overline normal-case tracking-normal')}>{label}</p>
      {deltaPct !== undefined && (
        <div className="flex flex-col items-center gap-0">
          <span className={cn(
            'inline-flex items-center gap-0.5 font-medium',
            compact ? 'text-[9px]' : 'text-[10px]',
            deltaIsGood ? 'text-success' : 'text-destructive',
          )}>
            {deltaPct >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
            {Math.abs(deltaPct).toFixed(0)}%
          </span>
          <span className={cn('text-muted-foreground normal-case tracking-normal', compact ? 'text-[8px] leading-tight' : 'text-[9px]')}>vs. período anterior</span>
        </div>
      )}
    </motion.div>
  );
}

export interface PendenciaSummary {
  tipo: string;
  descricao: string;
  quantidade: number;
  icone: 'ferias' | 'afastamentos' | 'admissoes' | 'assinaturas' | 'ponto' | 'documentos';
}

export function PendenciaItem({ pendencia, index, onClick, variant = 'default' }: {
  pendencia: PendenciaSummary; index: number; onClick?: () => void;
  /**
   * `default` — layout histórico (texto neutro + badge circular da
   * quantidade + chevron só no hover). Usado pelo card "Pendências" do
   * Dashboard Executivo — inalterado.
   * `dashboard` — layout "Ações em Destaque" da referência do Dashboard:
   * a quantidade já vem embutida no início de `descricao` (ex.: "3 férias
   * pendentes", montado em `usePendencias`), então o texto é exibido como
   * está, colorido conforme o tipo, sem badge redundante, com chevron fixo.
   */
  variant?: 'default' | 'dashboard';
}) {
  const iconMap: Record<string, React.ElementType> = {
    ferias: Calendar,
    afastamentos: AlertTriangle,
    admissoes: UserPlus,
    assinaturas: ShieldCheck,
    ponto: Clock,
    documentos: Briefcase,
  };
  const gradientMap: Record<string, string> = {
    ferias: 'from-primary/80 to-primary',
    afastamentos: 'from-primary/60 to-primary/90',
    admissoes: 'from-primary to-primary-glow',
    assinaturas: 'from-success/70 to-success',
    ponto: 'from-warning/70 to-warning',
    documentos: 'from-info/70 to-info',
  };
  const textToneMap: Record<string, string> = {
    ferias: 'text-primary',
    afastamentos: 'text-warning',
    admissoes: 'text-info',
    assinaturas: 'text-success',
    ponto: 'text-warning',
    documentos: 'text-info',
  };
  const Icon = iconMap[pendencia.icone] || AlertCircle;
  const isDashboard = variant === 'dashboard';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-muted/20 transition-all cursor-pointer group',
        // Glow leve ao passar o mouse — só na variante "Ações em Destaque"
        // do Dashboard; o card "Pendências" do Executivo (variant="default")
        // mantém o hover histórico, sem glow.
        isDashboard && 'hover:shadow-glow',
      )}
    >
      <div className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br', gradientMap[pendencia.icone])}>
        <Icon className="h-3.5 w-3.5 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-body truncate',
          isDashboard ? cn('font-medium', textToneMap[pendencia.icone] || 'text-foreground') : 'font-medium',
        )}>
          {pendencia.descricao}
        </p>
      </div>
      {isDashboard ? (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[12px] font-medium bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center">{pendencia.quantidade}</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
        </div>
      )}
    </motion.div>
  );
}

/** Widget de alertas de RH (view materializada). */
export function AlertasRHWidget({ maxItems = 8, compact = false }: { maxItems?: number; compact?: boolean } = {}) {
  const navigate = useNavigate();
  const { data: alertasReal = [], isLoading: isLoadingReal } = useQuery({
    queryKey: ['vw-alertas-rh'],
    queryFn: () => viewsService.alertasRH(),
    staleTime: 5 * 60 * 1000,
  });
  // MOCK VISUAL — substitui o resultado já resolvido do hook real acima;
  // nenhuma chamada extra é feita. Remover estas linhas desativa o mock aqui.
  const alertas = isDashboardMockEnabled() ? mockAlertasRH : alertasReal;
  const isLoading = isDashboardMockEnabled() ? false : isLoadingReal;

  if (isLoading) return <CardSkeleton className="h-32 border-0 p-0" />;
  if (!alertas.length) return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="p-3 rounded-2xl bg-muted/50 mb-3"><Activity className="h-6 w-6 text-muted-foreground" /></div>
      <p className="text-caption text-muted-foreground font-body">Nenhum alerta de RH</p>
    </div>
  );

  {/* Sem max-h/overflow próprios: o `ListCard` que envolve este widget no
      Dashboard já tem seu próprio `max-h-[380px] overflow-y-auto` — dois
      scrolls aninhados produziam uma barra de rolagem estranha e um segundo
      contêiner de corte dentro do primeiro. */}
  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {alertas.slice(0, maxItems).map((a: any, i: number) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => navigate('/relatorios')}
          className={cn(
            'flex items-center gap-3 rounded-xl glass text-sm hover:border-primary/20 cursor-pointer group transition-all',
            compact ? 'p-1.5' : 'p-2.5',
          )}
        >
          <div className={cn(
            'rounded-lg shrink-0',
            compact ? 'p-1' : 'p-1.5',
            a.prioridade === 'alta' ? 'bg-destructive/10 text-destructive' :
            a.prioridade === 'media' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info',
          )}>
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <span className="flex-1 truncate text-body font-body text-xs font-medium">{a.descricao || a.tipo || 'Alerta de sistema'}</span>
          <Badge variant="outline" className="text-[9px] uppercase font-medium tracking-tight opacity-70">
            {a.prioridade || 'Normal'}
          </Badge>
        </motion.div>
      ))}
    </div>
  );
}

/** Widget de cadastros incompletos (view materializada). */
export function CadastroIncompletoWidget() {
  const navigate = useNavigate();
  const { data: incompletos = [], isLoading } = useQuery({
    queryKey: ['vw-cadastro-incompleto'],
    queryFn: () => viewsService.cadastroIncompleto(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <CardSkeleton className="h-32 border-0 p-0" />;
  if (!incompletos.length) return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="p-3 rounded-2xl bg-gradient-to-br from-success/20 to-finance/10 mb-3"><CheckCircle2 className="h-6 w-6 text-success" /></div>
      <p className="text-caption text-muted-foreground font-body">Todos os cadastros estão completos</p>
    </div>
  );

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
      {incompletos.slice(0, 8).map((c: any, i: number) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => navigate(`/colaboradores/editar/${c.id}`)}
          className="flex items-center gap-3 p-2.5 rounded-xl glass text-sm hover:border-destructive/20 cursor-pointer group transition-all"
        >
          <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive shrink-0 group-hover:bg-destructive group-hover:text-white transition-colors">
            <AlertCircle className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium font-display">{c.nome_completo || 'Colaborador'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{c.campos_faltantes || 'Dados pendentes'}</p>
          </div>
          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity" />
        </motion.div>
      ))}
    </div>
  );
}

/** Widget monitor eSocial (visão consolidada). */
export function ESocialMonitorWidget() {
  const navigate = useNavigate();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-success" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Compliance eSocial</span>
        </div>
        <Badge variant="outline" className="text-[10px] bg-success/5 text-success border-success/20">98% Aceitação</Badge>
      </div>

      <div className="p-3 rounded-xl bg-muted/20 border border-border/30 space-y-2">
        <div className="flex justify-between text-[11px]">
          <span>Eventos S-1200</span>
          <span className="font-medium">148/150</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary w-[98%] rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg border border-border/10 bg-background/50 text-[10px]">
          <p className="text-muted-foreground">Certificado</p>
          <p className="font-medium text-success">Válido (224d)</p>
        </div>
        <div className="p-2 rounded-lg border border-border/10 bg-background/50 text-[10px]">
          <p className="text-muted-foreground">Último Envio</p>
          <p className="font-medium">Hoje, 14:30</p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-xl text-[10px] h-8 gap-1.5"
        onClick={() => navigate('/esocial')}
      >
        <ExternalLink className="h-3 w-3" />
        Acessar Central eSocial
      </Button>
    </div>
  );
}
