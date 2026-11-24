import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';

export interface PendenciaItem {
  icon: LucideIcon;
  texto: string;
  contexto: string;
  itens: string[];
  severidade: 'alta' | 'media';
  onClick: () => void;
}

interface PendenciasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendencias: PendenciaItem[];
}

export function PendenciasDialog({ open, onOpenChange, pendencias }: PendenciasDialogProps) {
  return (
    <AnimatedCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pendências"
      titleIcon={AlertTriangle}
      titleIconClassName="h-5 w-5 text-warning"
      emptyMessage="Nenhuma pendência identificada."
      items={pendencias.map((p, i) => (
        <div key={i} className="rounded-xl border border-border/30 p-3.5 space-y-2.5">
          <div className="flex items-center gap-3">
            <p.icon className={`h-4 w-4 shrink-0 ${p.severidade === 'alta' ? 'text-destructive' : 'text-warning'}`} />
            <span className="text-sm font-semibold flex-1 min-w-0">{p.texto}</span>
            <Badge variant={p.severidade === 'alta' ? 'destructive' : 'warning'} size="sm">
              {p.severidade === 'alta' ? 'Alta' : 'Média'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{p.contexto}</p>
          {p.itens.length > 0 && (
            <ul className="space-y-1 pl-1">
              {p.itens.map((item, j) => (
                <li key={j} className="text-xs text-foreground/90 flex gap-2">
                  <span className="text-muted-foreground shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={() => { onOpenChange(false); p.onClick(); }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Resolver agora
            </button>
          </div>
        </div>
      ))}
    />
  );
}
