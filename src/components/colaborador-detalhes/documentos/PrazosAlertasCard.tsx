import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useDocumentosPessoais, useDocumentos } from '@/hooks';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { cn } from '@/lib/utils';
import { PrazosAlertasDialog } from './PrazosAlertasDialog';

const MotionCard = motion.create(Card);

const DIAS_ALERTA_VALIDADE = 60;

interface AlertaValidade {
  id: string;
  titulo: string;
  sub: string;
  tone: 'success' | 'warning' | 'destructive';
  badgeLabel: string;
}

/** Painel "Prazos e Alertas" — calcula em cima das mesmas datas de validade
 * já cadastradas em Documentos Pessoais e Gestão de Documentos Digitais
 * (nenhum dado novo, nenhuma regra inventada): documento vencido =
 * destructive, vence em até 60 dias = warning, resto fica implícito no
 * resumo final "tudo certo". */
export function PrazosAlertasCard({ colaboradorId }: { colaboradorId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: docsPessoais, isLoading: isLoadingPessoais } = useDocumentosPessoais(colaboradorId);
  const { documentos: docsDigitais, isLoading: isLoadingDigitais } = useDocumentos(colaboradorId);

  const isLoading = isLoadingPessoais || isLoadingDigitais;

  const hoje = new Date();
  const alertas: AlertaValidade[] = [];

  const avaliarValidade = (id: string, titulo: string, validade: string) => {
    const dataValidade = new Date(validade);
    const dias = Math.round((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (dias < 0) {
      alertas.push({ id, titulo, sub: `Venceu em ${validade}`, tone: 'destructive', badgeLabel: 'Vencido' });
    } else if (dias <= DIAS_ALERTA_VALIDADE) {
      alertas.push({ id, titulo, sub: `Vence em ${dias} dia${dias === 1 ? '' : 's'} (${validade})`, tone: 'warning', badgeLabel: 'Em breve' });
    }
  };

  ((docsPessoais as any[] | undefined) ?? []).forEach(d => {
    if (d.data_validade) avaliarValidade(d.id, d.tipo_documento, d.data_validade);
  });
  (docsDigitais ?? []).forEach((d: any) => {
    if (d.data_validade) avaliarValidade(d.id, d.nome, d.data_validade);
  });

  return (
    <MotionCard custom={4} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated shrink-0 h-[174px] flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-start justify-between gap-2 mb-1 shrink-0">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-display font-medium">Prazos e Alertas</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Próximas validações e itens que requerem atenção.</p>
            </div>
          </div>
          <button type="button" onClick={() => setDialogOpen(true)} className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline shrink-0">
            Ver todos <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {isLoading ? <div className="flex justify-center py-4"><Spinner /></div> : (
          <div className="mt-2 flex-1 min-h-0 flex flex-col overflow-y-auto">
            {alertas.length === 0 ? (
              <div className="flex items-center gap-2.5 py-2.5">
                <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-success/10 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">Nenhuma pendência no momento</p>
                  <p className="text-[11px] text-muted-foreground">Todos os documentos com validade estão em dia.</p>
                </div>
                <Badge variant="success" size="sm" className="shrink-0">Tudo certo</Badge>
              </div>
            ) : alertas.map(a => (
              <div key={a.id} className="flex items-center gap-2.5 py-2.5 border-b border-border/20 last:border-0">
                <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', a.tone === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning')}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{a.titulo}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{a.sub}</p>
                </div>
                <Badge variant={a.tone} size="sm" className="shrink-0">{a.badgeLabel}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <PrazosAlertasDialog open={dialogOpen} onOpenChange={setDialogOpen} alertas={alertas} diasAlerta={DIAS_ALERTA_VALIDADE} />
    </MotionCard>
  );
}
