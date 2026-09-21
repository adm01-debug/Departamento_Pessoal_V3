import { Calendar, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import type { ProximoEventoBadgeTone } from '@/hooks/useProximosEventos';

export interface EventoDetalhado {
  icon: LucideIcon;
  titulo: string;
  categoria: string;
  dataFormatada: string;
  quandoLabel: string;
  badge: { label: string; tone: ProximoEventoBadgeTone };
  contexto: string;
  onClick: () => void;
}

interface ProximosEventosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventos: EventoDetalhado[];
}

export function ProximosEventosDialog({ open, onOpenChange, eventos }: ProximosEventosDialogProps) {
  return (
    <AnimatedCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Próximos Eventos"
      titleIcon={Calendar}
      emptyMessage="Nenhum evento futuro identificado."
      items={eventos.map((e, i) => (
        <div key={i} className="rounded-xl border border-border/30 p-3.5 space-y-2.5">
          <div className="flex items-center gap-3">
            <e.icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-semibold flex-1 min-w-0">{e.titulo}</span>
            <Badge variant={e.badge.tone} size="sm">{e.badge.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {e.categoria} · {e.dataFormatada}{e.quandoLabel ? ` · ${e.quandoLabel}` : ''}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{e.contexto}</p>
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={() => { onOpenChange(false); e.onClick(); }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver detalhes
            </button>
          </div>
        </div>
      ))}
    />
  );
}
