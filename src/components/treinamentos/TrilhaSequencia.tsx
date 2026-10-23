import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { metaEtapa, ordenarVinculos, type TrilhaCursoVinculo } from './trilhasDerivacoes';

/**
 * Sequência de aprendizagem da trilha — a ordem REAL de `trilhas_cursos.ordem`.
 *
 * O QUE NÃO É FEITO AQUI: nenhuma etapa recebe ✓ / estado "concluída" / destaque
 * de "etapa atual". O schema não guarda progresso POR PESSOA dentro da trilha
 * (`inscricoes_cursos` é por curso do catálogo, sem vínculo de ordem), então
 * qualquer marco seria inventado. A timeline é numerada e neutra; quando o
 * produto passar a ter acompanhamento individual, o estado entra no lugar do
 * círculo neutro.
 */
export function TrilhaSequencia({
  vinculos,
  carregando = false,
  onRemover,
  className,
}: {
  vinculos: readonly TrilhaCursoVinculo[];
  carregando?: boolean;
  /** Quando presente, cada etapa ganha a ação real de desvincular o curso. */
  onRemover?: (vinculoId: string) => void;
  className?: string;
}) {
  if (carregando) {
    return (
      <div className={cn('space-y-2.5', className)} aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="h-[22px] w-[22px] shrink-0 animate-pulse rounded-full bg-muted/50" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <span className="block h-2.5 w-3/4 animate-pulse rounded-full bg-muted/50" />
              <span className="block h-2 w-1/2 animate-pulse rounded-full bg-muted/30" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (vinculos.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed border-border/70 bg-muted/10 px-3 py-4 text-center text-[11px] text-muted-foreground',
          className
        )}
      >
        Nenhum curso vinculado a esta trilha ainda.
      </div>
    );
  }

  const ordenados = ordenarVinculos(vinculos);

  return (
    <ol className={cn('min-w-0', className)}>
      {ordenados.map((vinculo, index) => {
        const ultimo = index === ordenados.length - 1;
        const nome = vinculo.curso?.nome || 'Curso';
        return (
          <li key={vinculo.id} className="relative flex gap-3">
            {!ultimo && (
              <span aria-hidden className="absolute left-[10.5px] top-[24px] h-[calc(100%-18px)] w-px bg-border/70" />
            )}

            <span
              aria-hidden
              className={cn(
                'relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full',
                'border border-border/70 bg-background text-[10px] font-semibold tabular-nums text-muted-foreground'
              )}
            >
              {index + 1}
            </span>

            <div className={cn('flex min-w-0 flex-1 items-start gap-1.5', ultimo ? 'pb-0' : 'pb-3')}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium leading-tight text-foreground" title={nome}>
                  {nome}
                </p>
                <p
                  className="mt-0.5 truncate text-[10.5px] leading-snug text-muted-foreground"
                  title={metaEtapa(vinculo)}
                >
                  {metaEtapa(vinculo)}
                </p>
              </div>

              {onRemover && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Desvincular ${nome} da trilha`}
                  className="h-6 w-6 shrink-0 rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={() => onRemover(vinculo.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
