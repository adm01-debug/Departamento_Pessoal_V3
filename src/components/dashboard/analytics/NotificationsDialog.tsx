import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Check } from 'lucide-react';

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  created_at: string;
}

interface NotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notificacao[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationsDialog({
  open,
  onOpenChange,
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 rounded-2xl border-border/40 shadow-2xl glass">
        <DialogHeader className="p-6 pb-4 border-b border-border/10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-display font-bold">Central de Notificações</DialogTitle>
              <DialogDescription>Histórico de aprovações e ações do sistema.</DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onMarkAllRead} className="text-xs">
              Marcar todas como lidas
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'p-4 rounded-2xl border transition-all relative group',
                    n.lida ? 'bg-muted/10 border-border/10 opacity-60' : 'bg-primary/5 border-primary/20 shadow-xs'
                  )}
                >
                  <div className="flex gap-4">
                    <div
                      className={cn(
                        'p-2.5 rounded-xl shrink-0',
                        n.tipo === 'ponto_aprovado'
                          ? 'bg-success/10 text-success'
                          : n.tipo === 'ponto_recusado'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-info/10 text-info'
                      )}
                    >
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-sm">{n.titulo}</h4>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(n.created_at), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{n.mensagem}</p>
                    </div>
                    {!n.lida && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Marcar como lida"
                        onClick={() => onMarkRead(n.id)}
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-20" />
              <p>Nenhuma notificação encontrada.</p>
            </div>
          )}
        </div>
        <DialogFooter className="p-4 border-t border-border/10">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
