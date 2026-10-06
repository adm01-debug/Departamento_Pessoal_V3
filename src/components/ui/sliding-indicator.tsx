/**
 * INDICADOR DESLIZANTE — o contorno lime que anima entre colunas IGUAIS.
 *
 * Mecanismo EXTRAÍDO do toggle "Tabela/Cards" (`GestaoCandidatos`), onde nasceu,
 * para ser reusado TAMBÉM nos tabs de status da Jornada de Onboarding
 * ("Em andamento / Concluídos"). É a MESMA peça e a MESMA animação nos dois
 * lugares — nada de uma segunda implementação parecida.
 *
 * COMO FUNCIONA (CSS puro, SEM Framer Motion): uma ÚNICA peça `absolute`,
 * permanente, do tamanho de UMA coluna, montada como IRMÃ dos itens (por baixo
 * deles). O slide é um `transform: translate3d(...)` com `transition` NATIVA, que
 * roda no compositor/GPU — nenhum JS anima quadro a quadro.
 *
 * GEOMETRIA (sem medir DOM): o pai precisa ser `relative grid grid-cols-N p-1`.
 * O indicador fica em `left: 4px` e `width: calc(100%/N - 4px)` — exatamente a
 * largura de UMA coluna. Assim `translate3d(100%,0,0)` (100% da PRÓPRIA largura)
 * cai exatamente sobre a coluna seguinte. `willChange: transform` promove a
 * camada a GPU e evita microtravadas durante o slide.
 */
import { cn } from '@/lib/utils';

interface SlidingIndicatorProps {
  /** Índice da opção ATIVA (0-based): quantas colunas deslizar. */
  atual: number;
  /** Nº de opções — colunas de largura IGUAL. Default 2. */
  total?: number;
  /** Classes extras do contorno (cada tela mantém a própria pele). */
  className?: string;
}

export function SlidingIndicator({ atual, total = 2, className }: SlidingIndicatorProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-1 bottom-1 left-1 rounded-lg border border-primary',
        className,
      )}
      style={{
        width: `calc(${(100 / total).toFixed(4)}% - 4px)`,
        transform: `translate3d(${atual * 100}%, 0, 0)`,
        transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
      }}
    />
  );
}
