import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function NotificationBell() {
  const { notificacoes, naoLidas, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();
  const [open, setOpen] = useState(false);

  const recentes = notificacoes.slice(0, 10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl"
          aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : 'Notificações'}
        >
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-xl border border-border/30 shadow-elevated" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border/20">
          <span className="font-display font-semibold text-sm">Notificações</span>
          {naoLidas > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7 rounded-lg font-body" onClick={() => marcarTodasComoLidas()}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" />Marcar lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          {recentes.length === 0 ? (
            <p className="text-muted-foreground text-sm p-4 text-center font-body">Nenhuma notificação</p>
          ) : (
            <div className="divide-y divide-border/10">
              {recentes.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-2.5 p-3 hover:bg-accent/30 transition-colors cursor-pointer",
                    !n.lida && "bg-primary/[0.03]"
                  )}
                  onClick={() => { if (!n.lida) marcarComoLida(n.id); }}
                >
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", n.lida ? "bg-muted" : "bg-primary")} />
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-xs leading-snug">{n.titulo}</p>
                    {n.mensagem && <p className="text-muted-foreground font-body text-[11px] mt-0.5 line-clamp-2">{n.mensagem}</p>}
                    <p className="text-muted-foreground/50 font-body text-[10px] mt-1">
                      {new Date(n.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {recentes.length > 0 && (
          <div className="p-2 border-t border-border/20">
            <Button variant="ghost" className="w-full text-xs h-8 rounded-lg font-body" onClick={() => { setOpen(false); window.location.href = '/notificacoes'; }}>
              Ver todas as notificações
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
