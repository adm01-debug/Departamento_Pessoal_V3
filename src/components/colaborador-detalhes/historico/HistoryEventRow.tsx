import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/types/timelineEvent';
import { EVENT_TYPE_CONFIG } from './eventTypeConfig';
import { HistoryAuditDetailDialog } from './HistoryAuditDetailDialog';

interface HistoryEventRowProps {
  event: TimelineEvent;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  /** Mesma cor do donut "Tipos de eventos" pro tipo deste evento — ver eventTypeConfig.ts. */
  badgeColor?: string;
}

// Cascata de entrada: data desliza da esquerda → ícone "abre" de dentro pra
// fora (scale) → texto desliza da esquerda, nessa ordem, dentro de UMA
// linha; a linha seguinte começa sua própria sequência ROW_STAGGER segundos
// depois (não espera a anterior terminar — é isso que dá o efeito cascata
// contínuo, não "uma de cada vez"). Dispara de novo toda vez que o grupo do
// ano remonta (abrir/fechar o Collapsible), não a cada re-render.
const ROW_STAGGER = 0.12;
const SUB_STEP = 0.14;
const EASE = [0.25, 0.46, 0.45, 0.94] as const;

const slideVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: (delay: number) => ({ opacity: 1, x: 0, transition: { duration: 0.45, delay, ease: EASE } }),
};

const iconVariants = {
  hidden: { opacity: 0, scale: 0.2 },
  visible: (delay: number) => ({ opacity: 1, scale: 1, transition: { duration: 0.4, delay, ease: EASE } }),
};

/** "10 NOV" / "2026" a partir de um ISO (yyyy-MM-dd ou timestamp completo) — sem depender de nova lib, só Intl (mesmo locale pt-BR já usado no resto do app). */
function splitDate(iso: string): { diaMes: string; ano: string } {
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return { diaMes: '—', ano: '' };
  // `formatToParts` em vez de formatar a string inteira: o pt-BR do Node
  // intercala "de" entre dia e mês ("10 de nov."), então extrai só os
  // valores numérico/textual das partes em vez de tentar limpar a string.
  const parts = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).formatToParts(date);
  const dia = parts.find((p) => p.type === 'day')?.value ?? '';
  const mes = (parts.find((p) => p.type === 'month')?.value ?? '').replace('.', '');
  const diaMes = `${dia} ${mes}`.toUpperCase();
  const ano = new Intl.DateTimeFormat('pt-BR', { year: 'numeric' }).format(date);
  return { diaMes, ano };
}

export function HistoryEventRow({ event, index, isFirst, isLast, badgeColor }: HistoryEventRowProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const config = EVENT_TYPE_CONFIG[event.type];
  const Icon = config.icon;
  const { diaMes, ano } = splitDate(event.date);
  const hasDetail = !!event.auditDetail;

  // Mesma cor do donut "Tipos de eventos" (ver eventTypeConfig.ts) aplicada
  // via color-mix (padrão já usado em DashboardExecutivoPage.tsx) — o token
  // é `hsl(var(--x))`, não um hex, então dá pra misturar com `transparent`
  // sem precisar calcular alpha manualmente.
  const badgeStyle = badgeColor ? {
    color: badgeColor,
    borderColor: `color-mix(in srgb, ${badgeColor} 35%, transparent)`,
    backgroundColor: `color-mix(in srgb, ${badgeColor} 14%, transparent)`,
  } : undefined;

  // Acima de ~14 linhas a cascata pura ficaria longa demais pra esperar —
  // achata o incremento por linha sem cortar a animação.
  const rowBase = Math.min(index, 14) * ROW_STAGGER;
  const dateDelay = rowBase;
  const iconDelay = rowBase + SUB_STEP;
  const textDelay = rowBase + SUB_STEP * 2;

  return (
    <div className="group flex gap-3 border-b border-border/20 px-2 py-3 last:border-0 hover:bg-muted/20 transition-colors">
      {/* `AnimatePresence` local sem props: toda rota da app já vive dentro de
          <AnimatePresence initial={false}> (PageTransition.tsx), que se
          propaga por contexto pra QUALQUER motion.* descendente e bloqueia
          a entrada — mesmo caso documentado em HeadcountOverviewCard.tsx.
          Um AnimatePresence aninhado aqui cria um novo contexto de presença
          (initial=true por padrão), blindando a cascata contra esse bloqueio. */}
      <AnimatePresence>
        <motion.div
          key="date"
          className="w-14 shrink-0 pt-0.5"
          variants={slideVariants}
          initial="hidden"
          animate="visible"
          custom={dateDelay}
        >
          <p className="text-[13px] font-semibold leading-tight tabular-nums">{diaMes}</p>
          <p className="text-[10px] text-muted-foreground tabular-nums">{ano}</p>
        </motion.div>
      </AnimatePresence>

      <div className="relative flex w-9 shrink-0 justify-center">
        {!isFirst && <span className="absolute top-0 h-1/2 w-px bg-border/50" aria-hidden />}
        {!isLast && <span className="absolute bottom-0 h-1/2 w-px bg-border/50" aria-hidden />}
        <AnimatePresence>
          <motion.div
            key="icon"
            className={cn('relative z-10 flex h-9 w-9 items-center justify-center rounded-lg shrink-0', config.chip)}
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            custom={iconDelay}
          >
            <Icon className="h-4 w-4" />
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        <motion.div
          key="text"
          className="min-w-0 flex-1 pt-1"
          variants={slideVariants}
          initial="hidden"
          animate="visible"
          custom={textDelay}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium leading-tight">{event.title}</p>
            <Badge variant="outline" size="sm" className="shrink-0 font-normal" style={badgeStyle}>{config.label}</Badge>
          </div>
          {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
          {event.secondary && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{event.secondary}</p>}
        </motion.div>
      </AnimatePresence>

      <div className="flex shrink-0 items-start gap-1 pt-1">
        {hasDetail && (
          <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-xs" onClick={() => setDetailOpen(true)}>
            Ver detalhes
          </Button>
        )}
        {event.onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" aria-label="Mais ações">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={event.onDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Excluir registro
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {event.auditDetail && (
        <HistoryAuditDetailDialog open={detailOpen} onOpenChange={setDetailOpen} event={event} />
      )}
    </div>
  );
}
