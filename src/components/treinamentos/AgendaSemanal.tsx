import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import {
  abreviacaoDiaSemana,
  diasDaSemanaComTurmas,
  formatarIntervaloSemana,
  inicioSemana,
  numeroDia,
  somarDias,
  type Turma,
} from './turmasDerivacoes';

/**
 * AGENDA DA SEMANA — painel lateral do Hub de Turmas.
 *
 * Fonte única: `data_inicio` das turmas já carregadas (nenhuma consulta nova).
 * A semana inicial é a semana corrente quando ela tem turma; caso contrário, a
 * semana da turma com data mais próxima (ver `semanaSugeridaAgenda`). As setas
 * apenas navegam no calendário — nenhum registro é alterado.
 *
 * Não existe página de “calendário completo” no módulo, então nenhum botão sem
 * destino é renderizado.
 */
export interface AgendaSemanalProps {
  turmas: readonly Turma[];
  /** Semana sugerida pelo painel; `null` abre na semana corrente. */
  semanaInicial: Date | null;
  onAbrir: (turma: Turma) => void;
}

const MAX_EVENTOS_POR_DIA = 2;

export function AgendaSemanal({ turmas, semanaInicial, onAbrir }: AgendaSemanalProps) {
  const [semana, setSemana] = useState<Date>(() => inicioSemana(semanaInicial ?? new Date()));
  const inicializada = useRef(false);

  useEffect(() => {
    if (inicializada.current || !semanaInicial) return;
    inicializada.current = true;
    setSemana(inicioSemana(semanaInicial));
  }, [semanaInicial]);

  const dias = diasDaSemanaComTurmas(turmas, semana);
  const hoje = new Date();
  const hojeChave = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();

  return (
    <motion.section
      {...entradaCard(7)}
      aria-labelledby="turmas-agenda-titulo"
      data-turmas-agenda
      className="flex min-w-0 flex-col rounded-xl border border-border/50 bg-card/40 p-3"
    >
      <header className="mb-2 flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-info/25 bg-info/10 text-info">
          <CalendarDays className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="turmas-agenda-titulo" className="text-[13px] font-semibold leading-tight text-foreground">
            Agenda da semana
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground" aria-live="polite" data-agenda-range>
            {formatarIntervaloSemana(semana)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Semana anterior"
            onClick={() => setSemana((atual) => somarDias(atual, -7))}
            className="h-7 w-7 rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Próxima semana"
            onClick={() => setSemana((atual) => somarDias(atual, 7))}
            className="h-7 w-7 rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ul className="grid grid-cols-1 @[460px]:grid-cols-2 @[900px]:grid-cols-7 @[1180px]:grid-cols-1">
        {dias.map(({ data, turmas: turmasDoDia }) => {
          const ehHoje = data.getTime() === hojeChave;
          const visiveis = turmasDoDia.slice(0, MAX_EVENTOS_POR_DIA);
          const excedente = turmasDoDia.length - visiveis.length;

          return (
            <li
              key={data.toISOString()}
              className="grid grid-cols-[42px_minmax(0,1fr)] gap-2 border-b border-border/40 py-1.5 last:border-b-0 @[900px]:grid-cols-1 @[900px]:gap-1 @[900px]:rounded-md @[900px]:border @[900px]:p-1.5 @[1180px]:grid-cols-[42px_minmax(0,1fr)] @[1180px]:gap-2 @[1180px]:rounded-none @[1180px]:border-0 @[1180px]:border-b @[1180px]:p-0 @[1180px]:py-1.5"
            >
              <div className="flex flex-col items-center leading-none">
                <span
                  className={cn(
                    'text-[9px] font-semibold uppercase tracking-[0.08em]',
                    ehHoje ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {abreviacaoDiaSemana(data)}
                </span>
                <span
                  className={cn(
                    'mt-1 flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-[12.5px] font-semibold tabular-nums',
                    ehHoje ? 'bg-primary/15 text-primary' : 'text-foreground/90'
                  )}
                >
                  {numeroDia(data)}
                </span>
              </div>

              <div className="min-w-0">
                {visiveis.length === 0 ? (
                  <p className="py-1.5 text-[10.5px] leading-snug text-muted-foreground/80">
                    Nenhuma turma agendada para este dia.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {visiveis.map((turma) => (
                      <button
                        key={turma.id}
                        type="button"
                        onClick={() => onAbrir(turma)}
                        title={`${turma.cursoNome}${turma.hora ? ` · ${turma.hora}` : ''}${
                          turma.local ? ` · ${turma.local}` : ''
                        }`}
                        className="min-w-0 rounded-md border border-border/40 bg-background/50 px-2 py-1 text-left transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block truncate text-[10.5px] font-medium leading-tight text-foreground">
                          {turma.cursoNome}
                        </span>
                        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[9.5px] leading-none text-muted-foreground">
                          {turma.hora && <span className="shrink-0 tabular-nums">{turma.hora}</span>}
                          {turma.hora && turma.local && <span aria-hidden>·</span>}
                          {turma.local && <span className="truncate">{turma.local}</span>}
                        </span>
                      </button>
                    ))}
                    {excedente > 0 && (
                      <span
                        className="px-1 text-[9.5px] text-muted-foreground"
                        title={turmasDoDia
                          .slice(MAX_EVENTOS_POR_DIA)
                          .map((turma) => turma.cursoNome)
                          .join(' · ')}
                      >
                        +{excedente} {excedente === 1 ? 'outra turma' : 'outras turmas'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
