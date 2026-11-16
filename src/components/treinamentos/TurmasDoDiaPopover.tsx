import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { PONTO_STATUS } from './statusTurmaVisual';
import { TreinamentoStatusBadge } from './TreinamentoBadges';
import type { Turma } from './turmasDerivacoes';

/**
 * TURMAS DO DIA — lista completa aberta pelo contador “+N”.
 *
 * A agenda e o calendário mostram no máximo dois eventos por dia. Este popover
 * reutiliza o `Popover` do Design System (Radix) — não cria um novo sistema de
 * modal — e expõe TODAS as turmas do dia, cada uma com nome, horário, local e
 * status, permitindo abrir o `TurmaDetalheDialog` já existente.
 *
 * ACESSIBILIDADE: o gatilho é um `<button>`; o conteúdo é um diálogo do Radix
 * com foco gerenciado, fechamento por Escape/clique fora e itens navegáveis por
 * teclado (Tab/Shift+Tab + Enter/Espaço). Mouse e toque usam o mesmo caminho.
 */
export interface TurmasDoDiaPopoverProps {
  /** Dia a que as turmas pertencem (usado no cabeçalho e no `aria-label`). */
  data: Date;
  turmas: readonly Turma[];
  onAbrir: (turma: Turma) => void;
  /** Texto visível do gatilho (ex.: “+2 outras turmas”). */
  rotulo: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function TurmasDoDiaPopover({
  data,
  turmas,
  onAbrir,
  rotulo,
  className,
  align = 'start',
  side = 'bottom',
}: TurmasDoDiaPopoverProps) {
  const [aberto, setAberto] = useState(false);
  const dataCurta = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const ordenadas = [...turmas].sort(
    (a, b) => (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') || a.cursoNome.localeCompare(b.cursoNome, 'pt-BR')
  );

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-dia-popover-trigger
          aria-label={`${rotulo} em ${dataCurta}`}
          className={cn(
            'inline-flex w-fit items-center rounded-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            className
          )}
        >
          {rotulo}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        side={side}
        sideOffset={6}
        aria-label={`Turmas de ${dataCurta}`}
        className="w-72 max-w-[calc(100vw-1.5rem)] p-1.5"
      >
        <p className="px-2 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {dataCurta} · {ordenadas.length} {ordenadas.length === 1 ? 'turma' : 'turmas'}
        </p>

        <ul data-dia-popover-lista className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {ordenadas.map((turma) => {
            const detalhe = [turma.hora ?? 'Horário não informado', turma.local].filter(Boolean).join(' · ');
            return (
              <li key={turma.id}>
                <button
                  type="button"
                  data-dia-popover-turma={turma.id}
                  onClick={() => {
                    setAberto(false);
                    onAbrir(turma);
                  }}
                  title={`${turma.cursoNome}${detalhe ? ` · ${detalhe}` : ''}`}
                  className="group flex w-full min-w-0 items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span
                    className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', PONTO_STATUS[turma.statusInfo.tom])}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium text-foreground">{turma.cursoNome}</span>
                    <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                      <span className="min-w-0 truncate text-[9.5px] text-muted-foreground">{detalhe}</span>
                      <TreinamentoStatusBadge
                        status={turma.status}
                        className="h-5 shrink-0 px-1.5 text-[9px] leading-none"
                      />
                    </span>
                  </span>
                  <ArrowRight
                    className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
