import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { cn } from '@/lib/utils';
import { estiloCategoriaTreinamento } from './TreinamentoBadges';
import { metaEtapa, ordenarVinculos, type TrilhaCursoVinculo } from './trilhasDerivacoes';

/**
 * Sequência de aprendizagem da trilha — timeline vertical numerada.
 *
 * A ORDEM é a real de `trilhas_cursos.ordem` (ver `ordenarVinculos`): o número
 * exibido (`01`, `02`…) representa apenas a POSIÇÃO da etapa, nunca conclusão.
 * O schema não guarda progresso por pessoa dentro da trilha, então nenhuma
 * etapa recebe ✓, estado "atual" ou cor de concluída.
 *
 * Cada `<motion.li>` herda `cascadeItemVariants` do corpo do diálogo: as etapas
 * entram progressivamente junto com o cabeçalho e a nota, usando a MESMA
 * coreografia do modal Pendências (sem uma segunda configuração de animação).
 *
 * A linha conectora é um elemento de fluxo (`flex-1` dentro da coluna do
 * número), não um absoluto: ela acompanha a altura real do card mesmo quando o
 * nome do curso ocupa duas linhas.
 */
export function TrilhaSequencia({
  vinculos,
  carregando = false,
  onRemover,
  categoriaPorCurso,
  className,
}: {
  vinculos: readonly TrilhaCursoVinculo[];
  carregando?: boolean;
  /** Quando presente, cada etapa ganha a ação real de desvincular o curso. */
  onRemover?: (vinculoId: string) => void;
  /** Categoria real do curso (catálogo) para reutilizar o ícone do Design System. */
  categoriaPorCurso?: ReadonlyMap<string, string | null>;
  className?: string;
}) {
  if (carregando) {
    return (
      <motion.div variants={cascadeItemVariants} className={cn('mt-3 space-y-2.5', className)} aria-hidden>
        {[0, 1].map((i) => (
          <div key={i} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
            <span className="mx-auto mt-1 h-8 w-8 animate-pulse rounded-full bg-muted/50" />
            <span className="block h-[60px] animate-pulse rounded-xl border border-border/40 bg-muted/20" />
          </div>
        ))}
      </motion.div>
    );
  }

  if (vinculos.length === 0) {
    return (
      <motion.div
        variants={cascadeItemVariants}
        className={cn(
          'mt-3 rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-4 text-center text-[11.5px] text-muted-foreground',
          className
        )}
      >
        Esta trilha ainda não possui cursos.
      </motion.div>
    );
  }

  const ordenados = ordenarVinculos(vinculos);

  return (
    <ol className={cn('mt-3 min-w-0', className)} aria-label="Jornada de aprendizagem">
      {ordenados.map((vinculo, index) => {
        const ultimo = index === ordenados.length - 1;
        const nome = vinculo.curso?.nome || 'Curso sem nome';
        const categoria = categoriaPorCurso?.get(vinculo.curso_id) ?? null;
        const estilo = estiloCategoriaTreinamento(categoria);
        const Icone = estilo.icone;

        return (
          <motion.li
            key={vinculo.id}
            variants={cascadeItemVariants}
            className="group grid grid-cols-[32px_minmax(0,1fr)] gap-3"
          >
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--aqua)/0.3)] bg-background text-[10.5px] font-semibold tabular-nums text-[hsl(var(--aqua))]"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              {!ultimo && <span aria-hidden data-conector className="mt-1 w-px flex-1 bg-border/60" />}
            </div>

            <div
              className={cn(
                'min-w-0 rounded-xl border border-border/50 bg-muted/20 px-3.5 py-3',
                ultimo ? 'mb-0' : 'mb-2.5'
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', estilo.tile)}
                >
                  <Icone className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-foreground">{nome}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{metaEtapa(vinculo)}</p>
                </div>

                {onRemover && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Desvincular ${nome} da trilha`}
                    title={`Desvincular ${nome} da trilha`}
                    onClick={() => onRemover(vinculo.id)}
                    className="mt-0.5 h-7 w-7 shrink-0 rounded-md text-muted-foreground/60 opacity-100 transition-[opacity,color,background-color] hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-focus-within:opacity-100 sm:text-muted-foreground/70 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
