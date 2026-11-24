import type { LucideIcon } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';

export interface ComplianceItemDetalhado {
  label: string;
  detalhe: string;
  tone: 'success' | 'warning' | 'destructive';
  badgeLabel: string;
}

export interface ComplianceSecao {
  icon: LucideIcon;
  titulo: string;
  /** Explica o que a seção representa e por que importa (obrigação legal,
   * risco de não conformidade etc.) — mesmo texto pra todo mundo, não
   * depende dos itens específicos do colaborador. */
  explicacao: string;
  itens: ComplianceItemDetalhado[];
}

interface StatusComplianceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secoes: ComplianceSecao[];
}

/** Popup "Ver todos" do card Status de Compliance — mesma coreografia do
 * popup de Pendências (AnimatedCascadeDialog). Mostra, por categoria, o que
 * ela significa e por que importa, seguido de cada registro individual do
 * colaborador (o quê + quando), sem inventar regra nova: só detalha os
 * mesmos dados já resumidos no card compacto. */
export function StatusComplianceDialog({ open, onOpenChange, secoes }: StatusComplianceDialogProps) {
  return (
    <AnimatedCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Status de Compliance"
      titleIcon={ShieldCheck}
      titleIconClassName="h-4 w-4 text-primary"
      emptyMessage="Nenhum dado de compliance registrado."
      items={secoes.map((s, i) => (
        <div key={i} className="rounded-xl border border-border/30 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <s.icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-semibold">{s.titulo}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{s.explicacao}</p>
          {s.itens.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhum registro.</p>
          ) : (
            <ul className="space-y-1.5">
              {s.itens.map((item, j) => (
                <li key={j} className="flex items-start justify-between gap-2 rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground/90 truncate">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.detalhe}</p>
                  </div>
                  <Badge variant={item.tone} size="sm" className="shrink-0">{item.badgeLabel}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    />
  );
}
