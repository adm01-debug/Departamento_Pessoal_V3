import { GraduationCap, HeartHandshake, Lock, ShieldCheck, Sparkles, UserPlus, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizarTexto, statusTreinamento, type TomStatusTreinamento } from './treinamentosDerivacoes';

/**
 * Selos do Hub de Treinamentos.
 *
 * HIERARQUIA CROMÁTICA (3 níveis, sem tocar nos tokens globais):
 *   1. Informação principal — nomes/valores em tons neutros (`foreground`).
 *   2. Classificação — cada categoria tem uma FAMÍLIA de cor do Design System
 *      (`info` azul, `warning` âmbar, `chart-4` violeta, `aqua` ciano/teal) e o
 *      selo + o contêiner do ícone compartilham essa mesma família (config única
 *      em `CATEGORIAS`), em intensidade controlada: fundo 10–12%, borda 25% e
 *      texto na cor temática, sem glow.
 *   3. Estado operacional — só a coluna Status usa cor semântica:
 *      `success` (Em andamento), `info` (Planejado), `warning` (Aguardando
 *      início), `aqua` teal (Concluído — positivo e estável) e neutro apenas
 *      para “Não informado”. Fundos em 8% e bordas em 20%.
 * O Lime (`primary`) fica reservado aos destaques do sistema (aba ativa,
 * paginação, ações principais) — não é usado aqui.
 *
 * Status: o CÓDIGO interno nunca é reescrito — só o rótulo exibido. Status
 * ausente cai em "Não informado".
 *
 * Categoria: o schema atual de `treinamentos` NÃO possui categoria nem FK para
 * `catalogo_cursos`. O selo só usa a categoria quando o registro realmente a
 * traz; caso contrário mostra "Sem categoria" (neutro). Nada é inferido do nome.
 */

const TOM_STATUS: Record<TomStatusTreinamento, string> = {
  success: 'border-success/20 bg-success/[0.08] text-success',
  info: 'border-info/20 bg-info/[0.08] text-info',
  warning: 'border-warning/20 bg-warning/[0.08] text-warning',
  // “Concluído”: teal/verde-petróleo (`aqua`) — positivo e estável, sem cinza.
  teal: 'border-[hsl(var(--aqua)/0.2)] bg-[hsl(var(--aqua)/0.08)] text-[hsl(var(--aqua))]',
  neutral: 'border-border/70 bg-muted/30 text-muted-foreground',
  danger: 'border-destructive/25 bg-destructive/[0.08] text-destructive',
};

const TOM_PONTO: Record<TomStatusTreinamento, string> = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  teal: 'bg-[hsl(var(--aqua))]',
  neutral: 'bg-muted-foreground/70',
  danger: 'bg-destructive',
};

export function TreinamentoStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const info = statusTreinamento(status);
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10.5px] font-medium leading-none whitespace-nowrap',
        TOM_STATUS[info.tom],
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TOM_PONTO[info.tom])} />
      {info.label}
    </span>
  );
}

interface EstiloCategoria {
  /** Selo pill — fundo/borda/texto na cor da família. */
  badge: string;
  /** Contêiner 42×42 do ícone — MESMA família do selo. */
  tile: string;
  icone: LucideIcon;
}

/**
 * Famílias cromáticas do Design System (sem cores novas):
 *   azul    → `info`
 *   âmbar   → `warning`
 *   violeta → `chart-4`
 *   ciano   → `aqua` (teal do sistema)
 * Intensidades: fundo 10–12%, borda 25%, texto na cor cheia — exceto o violeta,
 * que recebe um leve clareamento derivado do próprio token para atingir
 * contraste AA em texto de 10,5px sobre o navy.
 */
const AZUL: Omit<EstiloCategoria, 'icone'> = {
  badge: 'border-info/25 bg-info/10 text-info',
  tile: 'border-info/25 bg-info/[0.12] text-info',
};

const AMBAR: Omit<EstiloCategoria, 'icone'> = {
  badge: 'border-warning/25 bg-warning/10 text-warning',
  tile: 'border-warning/25 bg-warning/[0.12] text-warning',
};

const VIOLETA: Omit<EstiloCategoria, 'icone'> = {
  // Texto levemente clareado com o próprio token (mistura com `foreground`):
  // em 10,5px o violeta puro não atinge contraste AA sobre o navy.
  badge:
    'border-[hsl(var(--chart-4)/0.25)] bg-[hsl(var(--chart-4)/0.1)] text-[color-mix(in_oklab,hsl(var(--chart-4))_78%,hsl(var(--foreground)))]',
  tile: 'border-[hsl(var(--chart-4)/0.25)] bg-[hsl(var(--chart-4)/0.12)] text-[color-mix(in_oklab,hsl(var(--chart-4))_78%,hsl(var(--foreground)))]',
};

const CIANO: Omit<EstiloCategoria, 'icone'> = {
  badge: 'border-[hsl(var(--aqua)/0.25)] bg-[hsl(var(--aqua)/0.1)] text-[hsl(var(--aqua))]',
  tile: 'border-[hsl(var(--aqua)/0.25)] bg-[hsl(var(--aqua)/0.12)] text-[hsl(var(--aqua))]',
};

/** Sem categoria: permanece neutro (sem identidade inventada). */
const CATEGORIA_NEUTRA: EstiloCategoria = {
  badge: 'border-border/70 bg-muted/50 text-muted-foreground',
  tile: 'border-border/70 bg-muted/50 text-muted-foreground',
  icone: GraduationCap,
};

/** CONFIG ÚNICA: categoria → família (usada pelo selo E pelo ícone). */
const CATEGORIAS: Record<string, EstiloCategoria> = {
  onboarding: { ...AZUL, icone: UserPlus },
  seguranca_do_trabalho: { ...AMBAR, icone: ShieldCheck },
  desenvolvimento_pessoal: { ...VIOLETA, icone: Sparkles },
  lideranca: { ...AZUL, icone: Users },
  compliance: { ...CIANO, icone: Lock },
  cultura: { ...VIOLETA, icone: HeartHandshake },
};

function estiloCategoria(categoria?: string | null): EstiloCategoria {
  if (!categoria) return CATEGORIA_NEUTRA;
  return CATEGORIAS[normalizarTexto(categoria).replace(/[\s-]+/g, '_')] ?? CATEGORIA_NEUTRA;
}

export function TreinamentoCategoriaBadge({ categoria, className }: { categoria?: string | null; className?: string }) {
  const rotulo = categoria?.trim() || 'Sem categoria';
  return (
    <span
      title={categoria ? rotulo : 'A tabela de treinamentos não possui vínculo de categoria com o catálogo de cursos.'}
      className={cn(
        'inline-flex h-6 max-w-full items-center rounded-full border px-2 text-[10.5px] font-medium leading-none',
        estiloCategoria(categoria).badge,
        className
      )}
    >
      <span className="truncate">{rotulo}</span>
    </span>
  );
}

/**
 * Contêiner 42×42 do ícone do treinamento.
 * A cor vem da MESMA entrada de `CATEGORIAS` usada pelo selo — o desenho também
 * varia por categoria e nunca é inferido do nome.
 */
export function TreinamentoIcone({ categoria, className }: { categoria?: string | null; className?: string }) {
  const estilo = estiloCategoria(categoria);
  const Icone = estilo.icone;
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border',
        estilo.tile,
        className
      )}
    >
      <Icone className="h-[18px] w-[18px]" />
    </span>
  );
}
