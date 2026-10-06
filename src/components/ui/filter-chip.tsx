/**
 * CHIP DE FILTRO RÁPIDO — peça compartilhada de filtros do produto.
 *
 * Nasceu dentro de `AuditoriaAdmissoesContent.tsx`; com a Jornada de Onboarding
 * passando a ter a mesma faixa de chips, virou helper de `ui/` para que as duas
 * telas não mantenham duas cópias que possam divergir (a regra de ouro da
 * consolidação: uma implementação, dois consumidores).
 *
 * Só APRESENTAÇÃO: rótulo, contagem real, pontinho de cor, ícone e estado ativo.
 * Quem decide o que o clique faz é a tela.
 */
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterChipProps {
  label: string;
  total: number;
  ativo: boolean;
  /** Classe do pontinho de cor (`bg-*`); omitida nos chips neutros. */
  ponto?: string;
  icone?: LucideIcon;
  onClick: () => void;
}

/** Atalho arredondado de filtro com contagem real. */
export function FilterChip({ label, total, ativo, ponto, icone: Icone, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        // `w-full`: o chip é o CONTEÚDO de um wrapper Motion que carrega a
        // geometria (`flex-1 min-w-fit`) — o botão só preenche o wrapper. `flex`
        // (não `inline-flex`) evita o respiro de linha do formato inline dentro
        // do wrapper, mantendo a altura exata de 32px. Comportamento de hover,
        // foco e estado ativo intactos.
        'flex h-8 w-full min-w-fit items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 text-[11.5px] font-medium transition-colors',
        // ATIVO = tinta cheia do `primary` do sistema (o mesmo amarelo/limão dos
        // botões primários) com texto escuro — é o destaque forte da referência.
        ativo
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border/40 bg-card text-muted-foreground hover:border-border/70 hover:bg-muted/50 hover:text-foreground'
      )}
    >
      {ponto && (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ativo ? 'bg-primary-foreground/60' : ponto)} />
      )}
      {Icone && <Icone className={cn('h-3.5 w-3.5 shrink-0', ativo && 'text-primary-foreground')} />}
      {label}
      <span className={cn('tabular-nums', ativo ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>
        ({total})
      </span>
    </button>
  );
}
