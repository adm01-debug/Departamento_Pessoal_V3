import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { entradaCard } from './entradaCards';

/**
 * ============================================================================
 * BANNER "FOCO AGORA" — Feedbacks.
 *
 * Faixa compacta de atenção, no MESMO idioma visual do banner de metas críticas
 * (`MetasCriticasBanner`): bordô translúcido (`--destructive-vivid`), ícone em
 * caixa arredondada, leitura principal + secundária e UMA ação à direita.
 *
 * Os números vêm do dado: `pendentes` é a contagem REAL de feedbacks ainda não
 * concluídos no ciclo selecionado e o prazo é a leitura de `ciclo.data_fim`.
 * Sem pendentes, o componente devolve `null` — a cor de alerta nunca é
 * decorativa.
 * ============================================================================
 */

interface FeedbacksFocoBannerProps {
  /** Quantidade real de feedbacks pendentes no ciclo. */
  pendentes: number;
  /** Leitura do prazo do ciclo ("Próximo prazo em 3 dias."). */
  prazo: string;
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice?: number;
  /** Ação real: liga o filtro "somente pendentes" da própria aba. */
  onVerPendentes?: () => void;
}

export function FeedbacksFocoBanner({ pendentes, prazo, indice = 0, onVerPendentes }: FeedbacksFocoBannerProps) {
  if (pendentes <= 0) return null;

  return (
    <motion.div
      {...entradaCard(indice)}
      className="flex flex-col gap-3 rounded-xl border border-destructive-vivid/30 bg-destructive-vivid/10 px-4 py-3 lg:flex-row lg:items-center lg:gap-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive-vivid/15 text-destructive-vivid">
          <AlertTriangle className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-destructive-vivid">Foco agora</p>
          <p className="text-[13px] font-medium leading-tight">
            {pendentes} {pendentes === 1 ? 'pessoa ainda aguarda' : 'pessoas ainda aguardam'} feedback neste ciclo.
          </p>
          <p className="text-[11px] leading-tight text-muted-foreground">{prazo}</p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1.5 self-start border-destructive-vivid/30 bg-transparent text-xs text-destructive-vivid hover:bg-destructive-vivid/10 hover:text-destructive-vivid lg:self-auto"
        onClick={onVerPendentes}
      >
        Ver pendentes
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}
