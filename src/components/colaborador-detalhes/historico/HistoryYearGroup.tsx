import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/types/timelineEvent';
import { HistoryEventRow } from './HistoryEventRow';

interface HistoryYearGroupProps {
  year: string;
  events: TimelineEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeColors: Partial<Record<TimelineEvent['type'], string>>;
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

export function HistoryYearGroup({ year, events, open, onOpenChange, typeColors }: HistoryYearGroupProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 border-b border-border/30 bg-muted/20 px-3 py-2.5 text-left transition-colors hover:bg-muted/30">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
          {year}
        </span>
        <span className="text-xs text-muted-foreground">{events.length} evento{events.length !== 1 ? 's' : ''}</span>
      </CollapsibleTrigger>
      {/* `forceMount` + framer-motion no lugar do `animate-accordion-down`
          (keyframe do Tailwind): aquela classe lê `--radix-accordion-content-height`,
          uma variável que só o primitivo Accordion define — o Collapsible usa
          outro nome. Sem a variável certa, a transição CSS nunca dispara o
          `animationend` que o Collapsible espera pra desmontar o conteúdo, e
          ele trava aberto/fechado pela metade. Controlando a altura aqui
          (0 ↔ "auto") não depende de nenhuma variável do Radix e anima os
          dois sentidos (abrir/fechar) do mesmo jeito. */}
      <CollapsibleContent forceMount>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ height: { duration: 0.3, ease: EASE }, opacity: { duration: 0.2, ease: EASE } }}
              style={{ overflow: 'hidden' }}
            >
              {events.map((event, i) => (
                <HistoryEventRow key={event.id} event={event} index={i} isFirst={i === 0} isLast={i === events.length - 1} badgeColor={typeColors[event.type]} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
}
