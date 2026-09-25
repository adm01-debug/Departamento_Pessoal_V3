import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TimelineEvent } from '@/types/timelineEvent';
import { HistoryYearGroup } from './HistoryYearGroup';

interface HistoryTimelineProps {
  /** Já filtrados (busca + tipo) e ordenados pelo componente pai. */
  events: TimelineEvent[];
  sortDir: 'desc' | 'asc';
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  /** Mesma cor por tipo usada no donut "Tipos de eventos" — ver eventTypeConfig.ts. */
  typeColors: Partial<Record<TimelineEvent['type'], string>>;
}

export function HistoryTimeline({ events, sortDir, hasActiveFilters, onClearFilters, typeColors }: HistoryTimelineProps) {
  // Estado de expandido/recolhido por ano — não reseta quando busca/filtro/
  // ordenação mudam (só é lido/escrito por ano, nunca substituído por inteiro).
  const [openYears, setOpenYears] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of events) {
      const year = e.date.slice(0, 4) || '—';
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(e);
    }
    const years = [...map.keys()].sort((a, b) => (sortDir === 'desc' ? b.localeCompare(a) : a.localeCompare(b)));
    return years.map((year) => ({ year, events: map.get(year)! }));
  }, [events, sortDir]);

  // Ordem cronológica (mais recente primeiro), independente da ordenação
  // escolhida pelo usuário — só serve pra decidir o estado inicial de cada
  // ano (os 2 mais recentes abertos, o resto recolhido, como na referência).
  const chronologicalYears = useMemo(() => {
    const set = new Set(events.map((e) => e.date.slice(0, 4)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [events]);

  const isOpen = (year: string) => {
    if (year in openYears) return openYears[year];
    return chronologicalYears.indexOf(year) < 2;
  };

  if (groups.length === 0) {
    return (
      <div data-testid="history-timeline" className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/30 py-16 text-center">
        <History className="h-8 w-8 text-muted-foreground/40" />
        {hasActiveFilters ? (
          <>
            <p className="text-sm font-medium text-foreground">Nenhum evento encontrado para os filtros selecionados.</p>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onClearFilters}>Limpar filtros</Button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">Nenhum evento no histórico</p>
            <p className="text-xs text-muted-foreground">Os eventos da jornada deste colaborador aparecerão aqui.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div data-testid="history-timeline" className="rounded-xl border border-border/30 overflow-hidden">
      {groups.map(({ year, events: yearEvents }) => (
        <HistoryYearGroup
          key={year}
          year={year}
          events={yearEvents}
          open={isOpen(year)}
          onOpenChange={(open) => setOpenYears((prev) => ({ ...prev, [year]: open }))}
          typeColors={typeColors}
        />
      ))}
    </div>
  );
}
