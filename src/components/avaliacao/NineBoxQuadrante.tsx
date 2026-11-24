import { motion, type TargetAndTransition, type Transition } from 'framer-motion';
import { ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iniciais } from './desempenhoComum';
import { PELE_QUADRANTE, QUADRANTE_POR_CHAVE, type PontoNineBox, type QuadranteKey } from './nineBoxComum';

/**
 * ============================================================================
 * QUADRANTE DO NINE-BOX — uma célula da matriz.
 *
 * Reproduz a composição da referência: superfície na cor da família do
 * quadrante, seta discreta no canto, nome, contagem grande, leitura da posição
 * ("Alto potencial, baixo desempenho") e a fileira de avatares (ou a linha
 * "Nenhum colaborador" com o ícone de pessoas, exatamente como na referência
 * quando o quadrante está vazio).
 *
 * GEOMETRIA: sem altura fixa — a célula é `flex flex-col` com `min-h-[132px]`,
 * então o conteúdo manda e nada é cortado. O card inteiro é o alvo de clique
 * (abre a lista do quadrante) e tem hover de borda, sem mover a célula.
 *
 * CORES: só tokens do tema (`PELE_QUADRANTE`) — o componente anterior usava
 * `bg-green-100`, que não existe no tema escuro.
 * ============================================================================
 */

/** Props de entrada (Framer) — a coreografia é montada no `NineBoxMatriz`. */
export interface EntradaQuadrante {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  transition: Transition;
}

interface NineBoxQuadranteProps {
  chave: QuadranteKey;
  pessoas: PontoNineBox[];
  onAbrir?: (chave: QuadranteKey) => void;
  /** Entrada animada (Framer) — vem da coreografia do `NineBoxMatriz`. */
  entrada?: EntradaQuadrante;
}

export function NineBoxQuadrante({ chave, pessoas, onAbrir, entrada }: NineBoxQuadranteProps) {
  const meta = QUADRANTE_POR_CHAVE[chave];
  const pele = PELE_QUADRANTE[chave];
  const visiveis = pessoas.slice(0, 4);
  const restantes = pessoas.length - visiveis.length;

  return (
    <motion.button
      type="button"
      onClick={() => onAbrir?.(chave)}
      aria-label={`${meta.nome} — ${pessoas.length} ${pessoas.length === 1 ? 'colaborador' : 'colaboradores'}`}
      {...entrada}
      className={cn(
        'group flex min-h-[106px] min-w-0 flex-col gap-1 rounded-xl border px-2.5 py-1.5 text-left transition-colors',
        pele.caixa,
        pele.borda
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-md border', pele.borda)}>
          <span className={cn('h-1.5 w-1.5 rounded-full bg-current', pele.tinta)} />
        </span>
        <ChevronRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
        />
      </div>

      <p className={cn('text-[11px] font-semibold uppercase leading-tight tracking-wide', pele.tinta)}>{meta.nome}</p>
      <p className={cn('font-display text-[28px] font-semibold leading-[0.9] tabular-nums', pele.tinta)}>
        {pessoas.length}
      </p>
      <p className="text-[10px] leading-tight text-muted-foreground">{meta.leitura}</p>

      <div className="mt-auto pt-0.5">
        {pessoas.length === 0 ? (
          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
            <Users aria-hidden className="h-3.5 w-3.5 shrink-0" />
            Nenhum colaborador
          </p>
        ) : (
          <div className="flex items-center gap-1">
            {visiveis.map((p) => (
              <span
                key={p.id}
                className="h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-inset ring-border/60"
              >
                {p.foto ? (
                  <img src={p.foto} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-muted/60 text-[9px] font-semibold text-muted-foreground">
                    {iniciais(p.nome)}
                  </span>
                )}
              </span>
            ))}
            {restantes > 0 && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/60 text-[9px] font-semibold tabular-nums text-muted-foreground ring-1 ring-inset ring-border/60">
                +{restantes}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}
