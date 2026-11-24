import { NotebookText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';

export interface AnotacaoDetalhada {
  id: string;
  titulo: string;
  tipo: string;
  conteudo?: string;
  dataFormatada: string;
}

interface AnotacoesInternasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anotacoes: AnotacaoDetalhada[];
}

// Explica o que cada categoria de anotação significa — mesmo texto pra
// qualquer colaborador, só o rótulo (`tipo`) muda por anotação.
const TIPO_EXPLICACAO: Record<string, string> = {
  elogio: 'Reconhecimento positivo registrado pelo gestor ou RH. Sem efeito disciplinar — serve de histórico para avaliações e decisões futuras (promoção, mérito).',
  feedback: 'Retorno estruturado do gestor ou RH sobre o desempenho do colaborador (pontos fortes e oportunidades de desenvolvimento). Alimenta ciclos de avaliação, não é uma medida disciplinar.',
  geral: 'Observação neutra do RH sobre o colaborador, sem categoria específica de mérito ou disciplina — fica no histórico como contexto.',
  advertencia: 'Registro informal de um problema pontual (ex.: atraso, comportamento) — diferente de uma medida disciplinar formal (ver "Status de Compliance"). Serve de alerta e histórico caso o problema se repita.',
};
const TIPO_LABEL: Record<string, string> = { elogio: 'Elogio', feedback: 'Feedback', geral: 'Geral', advertencia: 'Advertência' };
const TIPO_TONE: Record<string, 'success' | 'warning' | 'destructive' | 'info'> = { elogio: 'success', feedback: 'info', geral: 'info', advertencia: 'warning' };

/** Popup "Ver todos" do card Anotações Internas — mesma coreografia do popup
 * de Pendências. Mostra TODAS as anotações (o card compacto só mostra as 8
 * mais recentes), com o conteúdo completo (sem truncar) e uma explicação do
 * que cada categoria (`tipo`) significa e por que ela existe. */
export function AnotacoesInternasDialog({ open, onOpenChange, anotacoes }: AnotacoesInternasDialogProps) {
  return (
    <AnimatedCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Anotações Internas"
      titleIcon={NotebookText}
      titleIconClassName="h-4 w-4 text-success"
      emptyMessage="Nenhuma anotação registrada."
      items={anotacoes.map((a) => {
        const tone = TIPO_TONE[a.tipo] ?? 'info';
        return (
          <div key={a.id} className="rounded-xl border border-border/30 p-3.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold flex-1 min-w-0 truncate">{a.titulo}</span>
              <Badge variant={tone} size="sm" className="shrink-0">{TIPO_LABEL[a.tipo] ?? a.tipo}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground italic leading-relaxed">
              {TIPO_EXPLICACAO[a.tipo] ?? 'Registro interno do RH sobre o colaborador.'}
            </p>
            {a.conteudo && <p className="text-xs text-foreground/90 leading-relaxed">{a.conteudo}</p>}
            <p className="text-[11px] text-muted-foreground">Registrado em {a.dataFormatada}</p>
          </div>
        );
      })}
    />
  );
}
