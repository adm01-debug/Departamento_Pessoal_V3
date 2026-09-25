import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User, ArrowRight, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TimelineEvent } from '@/types/timelineEvent';

interface HistoryAuditDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: TimelineEvent;
}

// Reaproveita o diff visual que já existia em ColaboradorHistory.tsx (aba
// "Auditoria") — só muda de card fixo pra dialog, acionado pelo "Ver
// detalhes" da linha do evento na timeline unificada.
export function HistoryAuditDetailDialog({ open, onOpenChange, event }: HistoryAuditDetailDialogProps) {
  const detail = event.auditDetail;
  if (!detail) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Badge className={
              detail.acao === 'INSERT' ? 'bg-success/10 text-success border-success/20'
                : detail.acao === 'UPDATE' ? 'bg-info/10 text-info border-info/20'
                : 'bg-destructive/10 text-destructive border-destructive/20'
            }>
              {detail.acao === 'INSERT' ? 'Admissão/Criação' : detail.acao === 'UPDATE' ? 'Atualização' : 'Exclusão'}
            </Badge>
            <span className="text-xs font-normal text-muted-foreground">
              {format(new Date(event.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </span>
          </DialogTitle>
        </DialogHeader>

        {detail.userEmail && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" /> {detail.userEmail}
          </p>
        )}

        {detail.alteracoes.length > 0 ? (
          <div className="grid gap-2">
            {detail.alteracoes.map(({ campo, de, para }) => (
              <div key={campo} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/10 bg-muted/30 p-2 text-xs">
                <span className="flex items-center gap-1 font-medium text-primary">
                  <Tag className="h-3 w-3" /> {campo.replace(/_/g, ' ')}:
                </span>
                <span className="text-muted-foreground line-through decoration-destructive/30">{String(de ?? 'vazio')}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-semibold text-success">{String(para ?? 'vazio')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs italic text-muted-foreground">Registro inicial do colaborador no sistema.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
