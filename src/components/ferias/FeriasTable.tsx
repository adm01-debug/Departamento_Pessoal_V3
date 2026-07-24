import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { DollarSign, User, History, AlertTriangle } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';

type SeveridadePgto = { label: string; className: string } | null;
function calcularSeveridadePagamento(s: Record<string, any>): SeveridadePgto {
  if (s?.cancelado || s?.pagamento_confirmado) return null;
  const inicio = s?.data_inicio ? new Date(s.data_inicio) : null;
  if (!inicio || Number.isNaN(inicio.getTime())) return null;
  const dias = differenceInCalendarDays(inicio, new Date());
  if (dias < 0) return null;
  if (dias <= 2) return { label: `Pgto D-${dias} (crítico)`, className: 'bg-destructive text-destructive-foreground border-destructive' };
  if (dias <= 5) return { label: `Pgto D-${dias}`, className: 'bg-orange-500/15 text-orange-600 border-orange-500/40 dark:text-orange-400' };
  if (dias <= 10) return { label: `Pgto D-${dias}`, className: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/40 dark:text-yellow-400' };
  return null;
}
import { motion } from 'framer-motion';
import { FeriasWorkflowStepper } from './FeriasWorkflowStepper';
import { FeriasActions } from './FeriasActions';
import { FeriasAuditTimeline } from './FeriasAuditTimeline';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts';

interface FeriasTableProps {
  data: Record<string, any>[];
  onAprovarGestor: (id: string) => void;
  onAprovarRH: (id: string) => void;
  onEnviarContabilidade: (id: string) => void;
  onRejeitar: (id: string) => void;
  onCancelar: (id: string) => void;
}

export function FeriasTable({ data, ...actions }: FeriasTableProps) {
  const { isAdmin, hasRole } = useAuth();
  const podeVerAuditoria = isAdmin || hasRole('moderator');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl border border-border/30 overflow-hidden shadow-elevated"
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-display font-semibold">Colaborador</TableHead>
            <TableHead className="font-display font-semibold">Período</TableHead>
            <TableHead className="font-display font-semibold text-center">Dias</TableHead>
            <TableHead className="font-display font-semibold">Status</TableHead>
            <TableHead className="font-display font-semibold">Auditoria</TableHead>
            <TableHead className="font-display font-semibold">Workflow</TableHead>
            <TableHead className="font-display font-semibold">Abono/13°</TableHead>
            <TableHead className="w-[160px] font-display font-semibold text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((s, i) => (
            <motion.tr
              key={s.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="hover:bg-accent/30 transition-colors border-b border-border/20"
            >
              <TableCell className="font-body font-medium">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-border/50">
                    <AvatarImage src={s.colaborador?.foto_url} />
                    <AvatarFallback className="bg-primary/5 text-primary text-[10px]">
                      {s.colaborador?.nome_completo?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || <User className="h-3 w-3" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{s.colaborador?.nome_completo || '-'}</span>
                    <span className="text-[10px] text-muted-foreground">{s.colaborador?.cargo?.nome || 'Colaborador'}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-body text-sm text-muted-foreground">
                <div className="flex flex-col">
                  <span>{format(new Date(s.data_inicio), 'dd/MM/yyyy')}</span>
                  <span className="text-[10px] opacity-70">até {format(new Date(s.data_fim), 'dd/MM/yyyy')}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary font-display font-bold text-sm">
                  {s.dias_gozo || s.dias_ferias || '-'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {s.cancelado ? (
                    <Badge variant="destructive" className="text-xs w-fit">Cancelada</Badge>
                  ) : (
                    <StatusBadge status={s.status} />
                  )}
                  {(() => {
                    const sev = calcularSeveridadePagamento(s);
                    if (!sev) return null;
                    return (
                      <Badge variant="outline" className={`text-[10px] gap-1 w-fit font-body ${sev.className}`} title="Art. 145 CLT — pagamento devido até 2 dias antes do início">
                        <AlertTriangle className="h-3 w-3" />{sev.label}
                      </Badge>
                    );
                  })()}
                </div>
              </TableCell>
              <TableCell>
                {podeVerAuditoria ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-body rounded-lg hover:bg-primary/10 hover:text-primary">
                        <History className="h-3.5 w-3.5" /> Ver Trilha
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-display">
                          <History className="h-5 w-5 text-primary" /> Trilha de Auditoria
                        </DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <FeriasAuditTimeline solicitacaoId={s.id} />
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">Acesso restrito</span>
                )}
              </TableCell>
              <TableCell>
                <FeriasWorkflowStepper solicitacao={s} />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {s.abono_pecuniario && (
                    <Badge variant="outline" className="text-xs gap-1 border-border/30">
                      <DollarSign className="h-3 w-3" />Abono
                    </Badge>
                  )}
                  {s.adiantamento_13 && (
                    <Badge variant="outline" className="text-xs border-border/30">13°</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <FeriasActions solicitacao={s} {...actions} />
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}
