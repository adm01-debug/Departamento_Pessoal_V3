import { CalendarClock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';

export interface AlertaDetalhado {
  id: string;
  titulo: string;
  sub: string;
  tone: 'success' | 'warning' | 'destructive';
  badgeLabel: string;
}

interface PrazosAlertasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertas: AlertaDetalhado[];
  diasAlerta: number;
}

/** Popup "Ver todos" do card Prazos e Alertas — mesma coreografia do popup de
 * Pendências. Mostra todos os documentos/registros com validade cadastrada
 * que já venceram ou vencem em breve, com uma explicação fixa da regra
 * (mesma constante `DIAS_ALERTA_VALIDADE` usada pelo card) antes da lista. */
export function PrazosAlertasDialog({ open, onOpenChange, alertas, diasAlerta }: PrazosAlertasDialogProps) {
  return (
    <AnimatedCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Prazos e Alertas"
      titleIcon={CalendarClock}
      titleIconClassName="h-4 w-4 text-primary"
      emptyMessage="Nenhum documento com validade vencida ou próxima do vencimento."
      items={[
        <p key="intro" className="text-xs text-muted-foreground leading-relaxed">
          Documentos pessoais e arquivos digitais do colaborador que têm data de validade cadastrada
          (RG, CNH, ASO, contratos, etc.). Itens marcados <span className="text-destructive font-medium">Vencido</span> já
          passaram da validade e devem ser regularizados o quanto antes; itens <span className="text-warning font-medium">Em breve</span> vencem
          nos próximos {diasAlerta} dias e vale já agendar a renovação para não ficarem irregulares.
        </p>,
        ...alertas.map(a => (
          <div key={a.id} className="rounded-xl border border-border/30 p-3.5 space-y-1.5">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-4 w-4 shrink-0 ${a.tone === 'destructive' ? 'text-destructive' : 'text-warning'}`} />
              <span className="text-sm font-semibold flex-1 min-w-0 truncate">{a.titulo}</span>
              <Badge variant={a.tone} size="sm" className="shrink-0">{a.badgeLabel}</Badge>
            </div>
            <p className="text-xs text-muted-foreground pl-7">{a.sub}</p>
          </div>
        )),
      ]}
    />
  );
}
