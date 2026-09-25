import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ProximoEvento } from '@/hooks/useProximosEventos';

interface UpcomingEventsProps {
  eventos: ProximoEvento[];
  onVerTodos: () => void;
}

// Reaproveita os mesmos "Próximos Eventos" já calculados em
// useProximosEventos.ts (ver ColaboradorDetalhesPage.tsx, aba "Geral") — sem
// nenhuma query nova, sem inventar eventos futuros.
export function UpcomingEvents({ eventos, onVerTodos }: UpcomingEventsProps) {
  const preview = eventos.slice(0, 3);

  return (
    <Card className="rounded-xl border-border/30">
      <CardHeader className="flex flex-row items-center justify-between pt-4 pb-1.5 space-y-0">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <CalendarClock className="h-5 w-5 text-primary" /> Próximos eventos
        </CardTitle>
        {eventos.length > 0 && (
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onVerTodos}>Ver todos</Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {preview.length === 0 ? (
          <div className="py-2">
            <p className="text-xs font-medium text-foreground">Não há eventos futuros</p>
            <p className="mt-0.5 text-xs text-muted-foreground">O colaborador não possui eventos agendados no momento.</p>
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {preview.map((evento, i) => (
              <li key={`${evento.tipo}-${evento.data}-${i}`} className="flex items-start justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{evento.titulo}</p>
                  <p className="text-muted-foreground">{evento.categoria}</p>
                </div>
                <Badge variant={evento.badge.tone === 'success' ? 'success' : evento.badge.tone === 'warning' ? 'warning' : 'info'} size="sm" className="shrink-0">
                  {evento.badge.label}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
