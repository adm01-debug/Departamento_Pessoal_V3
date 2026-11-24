import { motion } from 'framer-motion';
import type { TimelineEvent } from '@/types/timelineEvent';
import type { ProximoEvento } from '@/hooks/useProximosEventos';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { JourneySummary } from './JourneySummary';
import { EventTypesSummary } from './EventTypesSummary';
import { UpcomingEvents } from './UpcomingEvents';
import { LastUpdate } from './LastUpdate';

interface HistorySidebarProps {
  colaborador?: { data_admissao?: string; status?: string; tipo_contrato?: string } | null;
  allEvents: TimelineEvent[];
  proximosEventos: ProximoEvento[];
  onVerTodosProximosEventos: () => void;
  /** Índice do primeiro card da sidebar na cascata — continua o stagger que
      começa no toolbar/timeline (ver HistoricoColaborador.tsx). */
  baseIndex: number;
}

export function HistorySidebar({ colaborador, allEvents, proximosEventos, onVerTodosProximosEventos, baseIndex }: HistorySidebarProps) {
  const latestEvent = allEvents[0];

  return (
    <div className="grid gap-4 content-start">
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={baseIndex}>
        <JourneySummary colaborador={colaborador} totalEventos={allEvents.length} ultimaMovimentacao={latestEvent?.date} />
      </motion.div>
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={baseIndex + 1}>
        <EventTypesSummary events={allEvents} />
      </motion.div>
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={baseIndex + 2}>
        <UpcomingEvents eventos={proximosEventos} onVerTodos={onVerTodosProximosEventos} />
      </motion.div>
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={baseIndex + 3}>
        <LastUpdate latestEvent={latestEvent} />
      </motion.div>
    </div>
  );
}
