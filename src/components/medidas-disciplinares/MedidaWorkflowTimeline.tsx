import { useQuery } from '@tanstack/react-query';
import { medidasDisciplinaresService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { GitBranch, CheckCircle2, XCircle, MessageSquareWarning, Send, Archive, Gavel, ShieldCheck } from 'lucide-react';

const acaoConfig: Record<string, { label: string; Icon: typeof GitBranch; className: string }> = {
  enviar_aprovacao: { label: 'Enviada para aprovação', Icon: Send, className: 'bg-primary/15 text-primary border-primary/30' },
  aprovar: { label: 'Aprovada', Icon: CheckCircle2, className: 'bg-success/15 text-success border-success/30' },
  rejeitar: { label: 'Rejeitada', Icon: XCircle, className: 'bg-destructive/15 text-destructive border-destructive/30' },
  arquivar: { label: 'Arquivada', Icon: Archive, className: 'bg-muted text-muted-foreground border-border' },
  contestar: { label: 'Contestada pelo colaborador', Icon: MessageSquareWarning, className: 'bg-warning/15 text-warning border-warning/30' },
  contestacao_aceita: { label: 'Contestação aceita', Icon: ShieldCheck, className: 'bg-success/15 text-success border-success/30' },
  contestacao_rejeitada: { label: 'Contestação rejeitada', Icon: Gavel, className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

export function MedidaWorkflowTimeline({ medidaId }: { medidaId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['medida-workflow-log', medidaId],
    queryFn: () => medidasDisciplinaresService.listarHistorico(medidaId),
    enabled: !!medidaId,
  });

  if (isLoading) return <div className="text-xs text-muted-foreground">Carregando timeline…</div>;
  if (data.length === 0) return <div className="text-xs text-muted-foreground">Nenhuma transição registrada.</div>;

  const sorted = [...data].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <Card className="border border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          Timeline do Workflow
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-2">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border/50" />
          <div className="space-y-3">
            {sorted.map((l: any, i: number) => {
              const cfg = acaoConfig[l.acao] ?? { label: l.acao, Icon: GitBranch, className: 'bg-muted text-muted-foreground border-border' };
              const { Icon } = cfg;
              let when = l.created_at;
              try { when = format(parseISO(l.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }); } catch { /* noop */ }
              return (
                <motion.div key={l.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex gap-3">
                  <div className={`relative z-10 h-8 w-8 rounded-full border flex items-center justify-center shrink-0 ${cfg.className}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{cfg.label}</span>
                      {l.from_status && l.to_status && (
                        <Badge variant="outline" className="text-[10px] h-5">{l.from_status} → {l.to_status}</Badge>
                      )}
                    </div>
                    {l.observacao && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{l.observacao}</p>}
                    <span className="text-[10px] text-muted-foreground/70">{when}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
