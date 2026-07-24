import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Calendar, UserPlus, AlertTriangle, CheckCircle2,
  Clock, FileText, X, Check, Info,
} from 'lucide-react';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeConfig: Record<string, { icon: React.ElementType; gradient: string }> = {
  periodo_aquisitivo: { icon: Calendar, gradient: 'from-primary-glow to-primary' },
  ferias_vencendo: { icon: Calendar, gradient: 'from-primary to-primary-glow' },
  contrato_vencendo: { icon: FileText, gradient: 'from-destructive to-streak' },
  documento_vencendo: { icon: AlertTriangle, gradient: 'from-destructive to-streak' },
  sucesso: { icon: CheckCircle2, gradient: 'from-primary to-primary-glow' },
  erro: { icon: AlertTriangle, gradient: 'from-destructive to-streak' },
  info: { icon: Info, gradient: 'from-primary to-primary-glow' },
};

const defaultConfig = { icon: Bell, gradient: 'from-primary to-primary-glow' };

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const {
    notificacoes,
    naoLidas,
    marcarComoLida,
    marcarTodasComoLidas,
    excluirNotificacao,
    isLoading,
  } = useNotificacoes();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent/50 rounded-xl"
          aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : 'Notificações'}
        >
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-card"
            >
              {naoLidas > 9 ? '9+' : naoLidas}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 glass border-border/50 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-sm">Notificações</h3>
            {naoLidas > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                {naoLidas} novas
              </span>
            )}
          </div>
          {naoLidas > 0 && (
            <Button variant="ghost" size="sm" onClick={() => marcarTodasComoLidas()} className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground">
              <Check className="h-3 w-3" />
              Marcar todas
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <AnimatePresence>
              {notificacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-3 rounded-2xl bg-success/10 mb-3">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <p className="text-sm font-display font-semibold">Tudo em dia!</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">Sem novas notificações</p>
                </div>
              ) : (
                notificacoes.map((notif, i) => {
                  const config = typeConfig[notif.tipo] || defaultConfig;
                  const Icon = config.icon;
                  const timeAgo = formatDistanceToNow(new Date(notif.created_at), { addSuffix: false, locale: ptBR });

                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, height: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => { if (!notif.lida) marcarComoLida(notif.id); }}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group border-b border-border/20 last:border-0',
                        !notif.lida ? 'bg-primary/[0.03]' : 'hover:bg-accent/30'
                      )}
                    >
                      <div className={cn('p-2 rounded-xl bg-gradient-to-br shrink-0 mt-0.5', config.gradient)}>
                        <Icon className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn('text-sm font-body truncate', !notif.lida ? 'font-semibold' : 'font-medium')}>
                            {notif.titulo}
                          </p>
                          {!notif.lida && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground font-body mt-0.5 truncate">{notif.mensagem}</p>
                        <p className="text-[11px] text-muted-foreground/60 font-body mt-1">{timeAgo} atrás</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); excluirNotificacao(notif.id); }}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Excluir notificação"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
