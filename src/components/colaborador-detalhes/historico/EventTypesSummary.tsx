import { PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DonutChart } from '@/components/dashboard/DonutChart';
import type { TimelineEvent, TimelineEventType } from '@/types/timelineEvent';
import { EVENT_TYPE_CONFIG, buildEventTypeColorMap } from './eventTypeConfig';

interface EventTypesSummaryProps {
  events: TimelineEvent[];
}

// Reaproveita o mesmo DonutChart + paleta já usados no card "Departamentos"
// do dashboard (src/components/dashboard/DepartmentsCard.tsx) — sem
// depender de lib de gráfico nova (Recharts já está instalado, mas nem
// precisa: o SVG puro do DonutChart já resolve rosca + legenda).
export function EventTypesSummary({ events }: EventTypesSummaryProps) {
  const counts = new Map<TimelineEventType, number>();
  for (const e of events) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);

  const colorByType = buildEventTypeColorMap(events);
  const segments = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({ label: EVENT_TYPE_CONFIG[type].label, value, color: colorByType[type]! }));

  return (
    <Card className="rounded-xl border-border/30">
      <CardHeader className="pt-4 pb-1.5">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <PieChart className="h-5 w-5 text-primary" /> Tipos de eventos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {segments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum evento registrado.</p>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <DonutChart segments={segments} size={112} strokeWidth={13} showLegend={false} />
            <ul className="grid w-full gap-1">
              {segments.map((seg) => (
                <li key={seg.label} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} aria-hidden />
                  <span className="flex-1 truncate text-muted-foreground">{seg.label}</span>
                  <span className="font-medium tabular-nums">{seg.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
