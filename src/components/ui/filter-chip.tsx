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
 *
 * DUAS VARIANTES — mesma peça, geometrias diferentes (o motivo de a geometria
 * NÃO morar fixa no botão):
 *  - `padrao`   o chip é o CONTEÚDO de um wrapper Motion que carrega a geometria
 *               (`flex-1 min-w-fit`): preenche o wrapper por igual e o ativo é a
 *               tinta CHEIA do `primary`. É o chip de Admissões e Onboarding.
 *  - `compacto` vive DIRETO na faixa flex da barra de filtros da Trilha de
 *               Auditoria de Desligamentos, como um item `flex-1 min-w-fit`: os
 *               chips absorvem a folga da linha (crescem por igual e a barra não
 *               fica com faixa vazia à direita), mas nunca encolhem abaixo do
 *               próprio texto — sem espaço, a barra rola por dentro. O ativo é
 *               contorno + tinta suave do `primary` com o contador em badge; o
 *               inativo é um casulo escuro discreto com o contador em texto — os
 *               seis chips e os três controles ficam colados na MESMA linha, sem
 *               o vão morto da versão anterior.
 */
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Geometria/linguagem visual do chip — ver o comentário do topo do arquivo. */
export type VarianteFilterChip = 'padrao' | 'compacto';

export interface FilterChipProps {
  label: string;
  total: number;
  ativo: boolean;
  /** Classe do pontinho de cor (`bg-*`); omitida nos chips neutros. */
  ponto?: string;
  icone?: LucideIcon;
  variante?: VarianteFilterChip;
  onClick: () => void;
}

/** Atalho arredondado de filtro com contagem real. */
export function FilterChip({
  label,
  total,
  ativo,
  ponto,
  icone: Icone,
  variante = 'padrao',
  onClick,
}: FilterChipProps) {
  // `compacto` vive em faixa flex SEM wrapper: precisa medir o próprio texto
  // (`w-auto shrink-0`). Sem isso o `w-full` herdado faria cada chip ocupar a
  // linha inteira — era exatamente esse o defeito da barra da Trilha.
  const compacto = variante === 'compacto';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        // `flex` (não `inline-flex`) evita o respiro de linha do formato inline,
        // mantendo a altura exata do chip. Comportamento de hover, foco e estado
        // ativo intactos nas duas variantes.
        'flex items-center justify-center whitespace-nowrap border font-medium transition-colors',
        compacto
          ? // Dimensões do chip compacto: 38px de altura, raio 10px, 10px de
            // respiro lateral e 6px entre rótulo e contador. `flex-1 min-w-fit`:
            // na barra de filtros os chips ABSORVEM a folga da linha e crescem por
            // igual (a barra não pode ter faixa vazia à direita), mas nunca
            // encolhem abaixo do próprio texto — quando não cabe, a barra rola.
            'h-[38px] min-w-fit flex-1 gap-1.5 rounded-[10px] px-2.5 text-[11px]'
          : // `w-full`: o chip é o CONTEÚDO de um wrapper Motion que carrega a
            // geometria (`flex-1 min-w-fit`) — o botão só preenche o wrapper.
            'h-8 w-full min-w-fit gap-2 rounded-full px-3 text-[11.5px]',
        ativo
          ? compacto
            ? // ATIVO COMPACTO = contorno fino + tinta suave do `primary` (lime):
              // destaca sem a faixa sólida que dominava a barra.
              'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
            : // ATIVO PADRÃO = tinta cheia do `primary` com texto escuro — o
              // destaque forte da referência de Admissões/Onboarding.
              'border-primary bg-primary text-primary-foreground shadow-sm'
          : compacto
            ? // INATIVO COMPACTO: casulo escuro próprio (`bg-muted/25` + borda
              // visível) para a faixa ler como UMA barra de filtros, como na
              // referência — e não como rótulos soltos sobre o fundo do card.
              'border-border/60 bg-muted/25 text-muted-foreground hover:border-border/80 hover:bg-muted/40 hover:text-foreground'
            : // INATIVO PADRÃO (Admissões/Onboarding): fundo do próprio card.
              'border-border/40 bg-card text-muted-foreground hover:border-border/70 hover:bg-muted/50 hover:text-foreground'
      )}
    >
      {ponto && (
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            ativo ? (compacto ? 'bg-primary' : 'bg-primary-foreground/60') : ponto
          )}
        />
      )}
      {Icone && <Icone className={cn('h-3.5 w-3.5 shrink-0', ativo && !compacto && 'text-primary-foreground')} />}
      {label}
      {compacto ? (
        <span
          className={cn(
            // Contador com padding mínimo: a caixa do contador ativo fica justa
            // no número e o chip mantém exatamente a mesma largura nos dois
            // estados (a barra de filtros nunca quebra, então não pode haver
            // salto de largura ao alternar ativo/inativo).
            'rounded-md px-0.5 py-0.5 text-center text-[10px] font-semibold tabular-nums',
            ativo ? 'bg-primary/20 text-primary' : 'text-muted-foreground/70'
          )}
        >
          {total}
        </span>
      ) : (
        <span className={cn('tabular-nums', ativo ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>
          ({total})
        </span>
      )}
    </button>
  );
}

