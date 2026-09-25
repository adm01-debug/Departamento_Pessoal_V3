import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';
import { useHistoricoColaborador } from '@/hooks/useHistoricoColaborador';
import type { ProximoEvento } from '@/hooks/useProximosEventos';
import type { TimelineEventType } from '@/types/timelineEvent';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { HistoryToolbar } from './HistoryToolbar';
import { HistoryTimeline } from './HistoryTimeline';
import { HistorySidebar } from './HistorySidebar';
import { buildEventTypeColorMap } from './eventTypeConfig';
import { HistoryCreateSalaryDialog } from './HistoryCreateSalaryDialog';
import { HistoryCreateContractDialog } from './HistoryCreateContractDialog';

interface HistoricoColaboradorProps {
  colaboradorId: string;
  proximosEventos: ProximoEvento[];
  onVerTodosProximosEventos: () => void;
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Substitui as 4 sub-abas antigas (Timeline Funcional / Histórico Salarial /
// Contratos / Auditoria) por uma única linha do tempo — cada uma delas vira
// só um tipo de evento filtrável (ver useHistoricoColaborador.ts).
export function HistoricoColaborador({ colaboradorId, proximosEventos, onVerTodosProximosEventos }: HistoricoColaboradorProps) {
  const { events, isLoading, colaborador, criarSalario, criandoSalario, criarContrato } = useHistoricoColaborador(colaboradorId);

  const [search, setSearch] = useState('');
  // null = nenhum filtro manual ainda tocado → equivale a "todos os tipos".
  const [activeTypes, setActiveTypes] = useState<Set<TimelineEventType> | null>(null);
  const [selectedYear, setSelectedYear] = useState('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);

  const availableTypes = useMemo(() => {
    const set = new Set<TimelineEventType>();
    events.forEach((e) => set.add(e.type));
    return [...set];
  }, [events]);

  const effectiveActiveTypes = useMemo(() => activeTypes ?? new Set(availableTypes), [activeTypes, availableTypes]);

  const years = useMemo(() => {
    const set = new Set(events.map((e) => e.date.slice(0, 4)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = normalize(search.trim());
    let list = events.filter((e) => effectiveActiveTypes.has(e.type));
    if (selectedYear !== 'all') list = list.filter((e) => e.date.slice(0, 4) === selectedYear);
    if (q) {
      list = list.filter((e) => normalize([e.title, e.description, e.secondary].filter(Boolean).join(' ')).includes(q));
    }
    return [...list].sort((a, b) => (sortDir === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  }, [events, effectiveActiveTypes, selectedYear, search, sortDir]);

  const hasActiveFilters = !!search.trim() || selectedYear !== 'all' || effectiveActiveTypes.size < availableTypes.length;

  // Mesma cor por tipo do donut "Tipos de eventos" — calculada a partir do
  // conjunto COMPLETO de eventos (não do filtrado), pra bater com o donut
  // (que também sempre reflete tudo) mesmo com filtro/busca ativos.
  const typeColors = useMemo(() => buildEventTypeColorMap(events), [events]);

  const handleToggleType = (type: TimelineEventType) => {
    setActiveTypes((prev) => {
      const base = new Set(prev ?? availableTypes);
      if (base.has(type)) base.delete(type); else base.add(type);
      return base;
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setActiveTypes(null);
    setSelectedYear('all');
  };

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center"><Spinner /></div>;
  }

  return (
    // `AnimatePresence` local sem props: toda rota da app já vive dentro de
    // <AnimatePresence initial={false}> (PageTransition.tsx), que se propaga
    // por contexto pra QUALQUER motion.* descendente e bloqueia a entrada
    // (mesmo caso documentado em HeadcountOverviewCard.tsx e já contornado
    // em HistoryEventRow.tsx/HistoryYearGroup.tsx). Um único AnimatePresence
    // aqui no topo blinda toda a cascata abaixo (toolbar, timeline e os 4
    // cards da sidebar) de uma vez, sem precisar repetir em cada um.
    <AnimatePresence>
    <div className="space-y-4">
      {/* Mesma animação de entrada dos cards do Dashboard Executivo
          (fade + slide-up com stagger por índice, ver cardVariants em
          MetricCard.tsx) — toolbar (0), timeline (1) e os 4 cards da
          sidebar (2 a 5, aplicados dentro de HistorySidebar) continuam a
          mesma cascata. */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
        <HistoryToolbar
          search={search}
          onSearchChange={setSearch}
          availableTypes={availableTypes}
          activeTypes={effectiveActiveTypes}
          onToggleType={handleToggleType}
          years={years}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          sortDir={sortDir}
          onSortChange={setSortDir}
          onCreateSalario={() => setSalaryDialogOpen(true)}
          onCreateContrato={() => setContractDialogOpen(true)}
        />
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
          <HistoryTimeline
            events={filteredEvents}
            sortDir={sortDir}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            typeColors={typeColors}
          />
        </motion.div>
        <HistorySidebar
          colaborador={colaborador}
          allEvents={events}
          proximosEventos={proximosEventos}
          onVerTodosProximosEventos={onVerTodosProximosEventos}
          baseIndex={2}
        />
      </div>

      <HistoryCreateSalaryDialog
        open={salaryDialogOpen}
        onOpenChange={setSalaryDialogOpen}
        colaboradorId={colaboradorId}
        onSubmit={criarSalario}
        isPending={criandoSalario}
      />
      <HistoryCreateContractDialog
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        onSubmit={criarContrato}
      />
    </div>
    </AnimatePresence>
  );
}
