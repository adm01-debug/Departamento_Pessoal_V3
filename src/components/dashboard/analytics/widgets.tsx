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
  Activity,
  AlertCircle,
  UserPlus,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatedNumber } from '../AnimatedNumber';
import { CardSkeleton } from '@/components/ui/module-skeleton';
import { viewsService } from '@/services/tabelasComplementaresService';
import { useQuery } from '@tanstack/react-query';

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
export function IndicatorRow({
  label,
  value,
  maxValue = 10,
  suffix = '%',
}: {
  label: string;
  value: number;
  maxValue?: number;
  suffix?: string;
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const getColor = () => {
    if (value >= maxValue * 0.8) return 'from-destructive to-destructive/70';
    if (value >= maxValue * 0.5) return 'from-primary-glow to-primary';
    return 'from-primary to-primary-glow';
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-body font-body font-medium">{label}</span>
        <span className="text-body font-display font-bold">
          {value.toFixed(1)}
          {suffix}
        </span>
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
export function QuickStat({
  label,
  value,
  icon: Icon,
  gradient,
  index = 0,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center gap-3.5 p-3.5 rounded-xl glass hover:border-border/60 transition-all group"
    >
      <div
        className={cn(
          'p-2.5 rounded-xl bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform',
          gradient
        )}
      >
        <Icon className="h-4 w-4 text-primary-foreground" />
      </div>
      <div>
        <p className="text-h2 font-display font-bold">
          <AnimatedNumber value={value} />
        </p>
        <p className="text-caption text-muted-foreground font-body">{label}</p>
      </div>
    </motion.div>
  );
}

export interface PendenciaSummary {
  tipo: string;
  descricao: string;
  quantidade: number;
  icone: 'ferias' | 'afastamentos' | 'admissoes' | 'assinaturas' | 'ponto' | 'documentos';
}

export function PendenciaItem({
  pendencia,
  index,
  onClick,
}: {
  pendencia: PendenciaSummary;
  index: number;
  onClick?: () => void;
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
  const Icon = iconMap[pendencia.icone] || AlertCircle;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl glass hover:border-primary/20 transition-all cursor-pointer group"
    >
      <div className={cn('p-2.5 rounded-xl bg-gradient-to-br', gradientMap[pendencia.icone])}>
        <Icon className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body font-body font-medium truncate">{pendencia.descricao}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-caption font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
          {pendencia.quantidade}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
      </div>
    </motion.div>
  );
}

/** Widget de alertas de RH (view materializada). */
export function AlertasRHWidget() {
  const navigate = useNavigate();
  const { data: alertas = [], isLoading } = useQuery({
    queryKey: ['vw-alertas-rh'],
    queryFn: () => viewsService.alertasRH(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <CardSkeleton className="h-32 border-0 p-0" />;
  if (!alertas.length)
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="p-3 rounded-2xl bg-muted/50 mb-3">
          <Activity className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-caption text-muted-foreground font-body">Nenhum alerta de RH</p>
      </div>
    );

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
      {alertas.slice(0, 8).map((a, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => navigate('/relatorios')}
          className="flex items-center gap-3 p-2.5 rounded-xl glass text-sm hover:border-primary/20 cursor-pointer group transition-all"
        >
          <div
            className={cn(
              'p-1.5 rounded-lg shrink-0',
              a.tipo === 'alta'
                ? 'bg-destructive/10 text-destructive'
                : a.tipo === 'media'
                  ? 'bg-warning/10 text-warning'
                  : 'bg-info/10 text-info'
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <span className="flex-1 truncate text-body font-body text-xs font-medium">
            {a.titulo || a.mensagem || 'Alerta de sistema'}
          </span>
          <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tight opacity-70">
            {a.tipo || 'Normal'}
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
  if (!incompletos.length)
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-success/20 to-finance/10 mb-3">
          <CheckCircle2 className="h-6 w-6 text-success" />
        </div>
        <p className="text-caption text-muted-foreground font-body">Todos os cadastros estão completos</p>
      </div>
    );

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
      {incompletos.slice(0, 8).map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => navigate(`/colaboradores/${c.id}/editar`)}
          className="flex items-center gap-3 p-2.5 rounded-xl glass text-sm hover:border-destructive/20 cursor-pointer group transition-all"
        >
          <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive shrink-0 group-hover:bg-destructive group-hover:text-white transition-colors">
            <AlertCircle className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold font-display">{c.nome_completo || 'Colaborador'}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {Array.isArray(c.campos_faltantes) ? c.campos_faltantes.join(', ') : 'Dados pendentes'}
            </p>
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
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Compliance eSocial</span>
        </div>
        <Badge variant="outline" className="text-[10px] bg-success/5 text-success border-success/20">
          98% Aceitação
        </Badge>
      </div>

      <div className="p-3 rounded-xl bg-muted/20 border border-border/30 space-y-2">
        <div className="flex justify-between text-[11px]">
          <span>Eventos S-1200</span>
          <span className="font-bold">148/150</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary w-[98%] rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg border border-border/10 bg-background/50 text-[10px]">
          <p className="text-muted-foreground">Certificado</p>
          <p className="font-bold text-success">Válido (224d)</p>
        </div>
        <div className="p-2 rounded-lg border border-border/10 bg-background/50 text-[10px]">
          <p className="text-muted-foreground">Último Envio</p>
          <p className="font-bold">Hoje, 14:30</p>
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
