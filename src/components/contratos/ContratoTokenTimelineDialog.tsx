import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileSignature, RefreshCw, Ban, CalendarPlus, Mail, MousePointerClick,
  ShieldAlert, CheckCircle2, Clock, History,
} from 'lucide-react';
import { useContratoTokenTimeline, type ContratoTokenEvento } from '@/hooks/useContratoTokenTimeline';

interface Props {
  tokenId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const EVENTO_META: Record<
  ContratoTokenEvento['evento'],
  { label: string; icon: typeof FileSignature; color: string }
> = {
  gerado: { label: 'Link gerado', icon: FileSignature, color: 'text-primary' },
  reenviado: { label: 'Reenviado', icon: RefreshCw, color: 'text-primary' },
  revogado: { label: 'Revogado', icon: Ban, color: 'text-destructive' },
  estendido: { label: 'Prazo estendido', icon: CalendarPlus, color: 'text-amber-600 dark:text-amber-400' },
  lembrete_enviado: { label: 'Lembrete enviado', icon: Mail, color: 'text-muted-foreground' },
  acesso_link: { label: 'Link acessado', icon: MousePointerClick, color: 'text-muted-foreground' },
  tentativa_invalida: { label: 'Tentativa inválida', icon: ShieldAlert, color: 'text-destructive' },
  assinado: { label: 'Contrato assinado', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
  expirado: { label: 'Expirado', icon: Clock, color: 'text-destructive' },
};

function formatDetalhes(evento: ContratoTokenEvento): string | null {
  const d = evento.detalhes ?? {};
  switch (evento.evento) {
    case 'gerado':
      return d.email ? `E-mail: ${String(d.email)}` : null;
    case 'revogado':
      return d.motivo ? `Motivo: ${String(d.motivo)}` : 'Sem motivo informado';
    case 'estendido':
      return d.de && d.para
        ? `De ${new Date(String(d.de)).toLocaleString('pt-BR')} → ${new Date(String(d.para)).toLocaleString('pt-BR')}`
        : null;
    case 'lembrete_enviado':
      return d.total ? `Lembrete #${String(d.total)}` : null;
    case 'assinado':
      return d.hash ? `Hash: ${String(d.hash).slice(0, 16)}…` : null;
    default:
      return null;
  }
}

export function ContratoTokenTimelineDialog({ tokenId, open, onOpenChange }: Props) {
  const { data, isLoading } = useContratoTokenTimeline(open ? tokenId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Trilha de auditoria do link
          </DialogTitle>
          <DialogDescription>
            Todos os eventos registrados neste token de assinatura, do envio à conclusão.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Nenhum evento registrado ainda.
          </div>
        ) : (
          <ScrollArea className="max-h-[420px] pr-3">
            <ol className="relative space-y-3 border-l border-border pl-5">
              {data.map((ev) => {
                const meta = EVENTO_META[ev.evento];
                const Icon = meta.icon;
                const detalhes = formatDetalhes(ev);
                return (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[26px] top-1 flex h-4 w-4 items-center justify-center rounded-full border bg-background">
                      <Icon className={`h-3 w-3 ${meta.color}`} />
                    </span>
                    <div className="rounded-md border bg-card p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{meta.label}</span>
                          {ev.ator_nome && (
                            <Badge variant="outline" className="text-[10px]">
                              {ev.ator_nome}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ev.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {detalhes && (
                        <div className="mt-1 text-xs text-muted-foreground">{detalhes}</div>
                      )}
                      {ev.ip && (
                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                          IP: {ev.ip}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
