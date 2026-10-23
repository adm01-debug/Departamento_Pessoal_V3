import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * “MAIS TURMAS EM BREVE” — fecho da coluna “Em andamento”.
 *
 * É um componente COMPLEMENTAR, não um registro de turma: não entra em
 * `grupos`, não é contado pelo cabeçalho da coluna, não passa por filtro/
 * ordenação, não alimenta a agenda semanal e não é persistido em lugar nenhum.
 * Quem o posiciona é o `TurmasPainel`, como último filho da coluna
 * `andamento`, depois dos cards reais.
 *
 * VISUAL (referência aprovada): fundo escuro do sistema, borda tracejada
 * discreta na cor de “Em andamento”, raio de 12px, conteúdo centralizado
 * vertical e horizontalmente, ícone de grupo em 32px, título 14px/600,
 * descrição 12px em cor secundária (no máximo três linhas) e, quando houver
 * fluxo real de criação, o CTA “Nova Turma”.
 *
 * CTA — CONECTADO AO FLUXO REAL: `NovaTurmaDialog` usa a operação existente
 * `catalogoCursoService.criarInstancia` (sem API nova) e a autorização vem da
 * matriz `permissions` (`treinamentos/create`) verificada pelo chamador. O CTA
 * só é renderizado quando as DUAS coisas existem: `onNovaTurma` e
 * `podeCriarTurma`. No modo demonstração, o submit é bloqueado pelo guard de
 * escrita do módulo.
 *
 * MOVIMENTO: o card não anima sozinho. O painel o envolve na MESMA entrada
 * dos cards de turma (`linhaEntradaHubVariants`), com índice posterior ao do
 * último card real; `prefers-reduced-motion` continua sendo tratado pelo
 * `MotionConfig` da página.
 * ============================================================================
 */
export interface MaisTurmasCardProps {
  /** Fluxo REAL de criação de turma. Sem ele, o card fica apenas informativo. */
  onNovaTurma?: () => void;
  /** Autorização já verificada pelo chamador (nunca inferida do próprio botão). */
  podeCriarTurma?: boolean;
  className?: string;
}

const TITULO_ID = 'mais-turmas-em-breve-titulo';

export function MaisTurmasCard({ onNovaTurma, podeCriarTurma = false, className }: MaisTurmasCardProps) {
  // Ausência do fluxo OU da autorização ⇒ nenhum botão (nada de CTA morto).
  const exibirBotao = Boolean(onNovaTurma) && podeCriarTurma;

  return (
    <article
      data-mais-turmas-em-breve
      aria-labelledby={TITULO_ID}
      className={cn(
        'flex h-full min-h-[232px] w-full min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[hsl(var(--info)/0.3)] bg-card/20 px-5 py-6 text-center @[900px]:min-h-[240px]',
        className
      )}
    >
      <Users className="h-8 w-8 text-info" strokeWidth={1.5} aria-hidden />

      <h3 id={TITULO_ID} className="text-[14px] font-semibold leading-snug text-foreground">
        Mais turmas em breve
      </h3>

      <p className="max-w-[28ch] text-[12px] leading-relaxed text-muted-foreground">
        Novas oportunidades de aprendizado para o seu time.
      </p>

      {exibirBotao && (
        <Button
          type="button"
          variant="outline"
          onClick={onNovaTurma}
          className="mt-1 h-9 gap-2 rounded-[9px] border-[hsl(var(--info)/0.45)] bg-background/40 px-4 text-[12.5px] font-medium text-foreground transition-colors hover:border-[hsl(var(--info)/0.65)] hover:bg-[hsl(var(--info)/0.12)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          Nova Turma
        </Button>
      )}
    </article>
  );
}
