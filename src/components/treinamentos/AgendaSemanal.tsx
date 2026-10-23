import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import { PONTO_STATUS } from './statusTurmaVisual';
import { TurmasDoDiaPopover } from './TurmasDoDiaPopover';
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
 * CALENDÁRIO COMPLETO: quando o painel fornece `onVerCalendarioCompleto`, o
 * rodapé abre a visão mensal real (`CalendarioTurmasDialog`) no mês do primeiro
 * dia COM TURMA da semana exibida — se a semana começa em um mês e o evento cai
 * no seguinte, o calendário abre no mês do evento. Sem turmas, usa a
 * segunda-feira exibida. Sem destino, o botão não é renderizado.
 *
 * MAIS DE DUAS TURMAS NO DIA: os dois primeiros minicards ficam visíveis e o
 * contador “+N” abre o `TurmasDoDiaPopover` com TODAS as turmas do dia,
 * permitindo abrir qualquer uma nos detalhes (inclusive pelo teclado).
 *
 * DISTRIBUIÇÃO VERTICAL: o painel acompanha a altura da linha da grade
 * (`flex-1`); o cabeçalho e o rodapé do calendário são `shrink-0` e a lista fica
 * com o espaço restante. As sete linhas usam
 * `grid-rows-[repeat(7,minmax(auto,1fr))]`: dividem a sobra igualmente, mas
 * NUNCA encolhem abaixo do próprio conteúdo — um dia com dois minicards e o
 * contador “+N” aumenta a trilha e o painel acompanha, sem corte, sobreposição
 * ou rolagem interna. No mobile (painel empilhado, altura automática) o
 * resultado é a soma natural das linhas, sem área vazia.
 */
export interface AgendaSemanalProps {
  turmas: readonly Turma[];
  /** Semana sugerida pelo painel; `null` abre na semana corrente. */
  semanaInicial: Date | null;
  onAbrir: (turma: Turma) => void;
  /** Destino real do rodapé: recebe a data de referência do mês (primeiro dia com turma na semana; senão a segunda-feira exibida). */
  onVerCalendarioCompleto?: (dataReferencia: Date) => void;
}

const MAX_EVENTOS_POR_DIA = 2;

export function AgendaSemanal({ turmas, semanaInicial, onAbrir, onVerCalendarioCompleto }: AgendaSemanalProps) {
  const [semana, setSemana] = useState<Date>(() => inicioSemana(semanaInicial ?? new Date()));
  const inicializada = useRef(false);

  useEffect(() => {
    if (inicializada.current || !semanaInicial) return;
    inicializada.current = true;
    setSemana(inicioSemana(semanaInicial));
  }, [semanaInicial]);

  const dias = diasDaSemanaComTurmas(turmas, semana);
  /**
   * Mês de referência do calendário: o primeiro dia da semana que realmente
   * tem turma (a semana pode começar em um mês e o evento cair no seguinte).
   * Sem turmas, usa a própria segunda-feira exibida.
   */
  const dataCalendario = dias.find((dia) => dia.turmas.length > 0)?.data ?? semana;
  const hoje = new Date();
  const hojeChave = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();

  return (
    <motion.section
      {...entradaCard(7)}
      aria-labelledby="turmas-agenda-titulo"
      data-turmas-agenda
      className="flex min-w-0 flex-1 flex-col rounded-xl border border-border/50 bg-card/40 p-3"
    >
      <header className="mb-2 flex shrink-0 items-start gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-info/25 bg-info/10 text-info">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="turmas-agenda-titulo" className="truncate text-[12.5px] font-semibold leading-tight text-foreground">
            Agenda da semana
          </h3>
          <p
            className="mt-0.5 truncate text-[10.5px] leading-tight text-muted-foreground"
            aria-live="polite"
            data-agenda-range
          >
            {formatarIntervaloSemana(semana)}
          </p>
        </div>
        <div className="-mt-0.5 flex shrink-0 items-center gap-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Semana anterior"
            onClick={() => setSemana((atual) => somarDias(atual, -7))}
            className="h-6 w-6 rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Próxima semana"
            onClick={() => setSemana((atual) => somarDias(atual, 7))}
            className="h-6 w-6 rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <ul data-agenda-lista className="grid min-h-0 flex-1 grid-rows-[repeat(7,minmax(auto,1fr))]">
        {dias.map(({ data, turmas: turmasDoDia }) => {
          const ehHoje = data.getTime() === hojeChave;
          const visiveis = turmasDoDia.slice(0, MAX_EVENTOS_POR_DIA);
          const excedente = turmasDoDia.length - visiveis.length;

          return (
            <li
              key={data.toISOString()}
              data-agenda-dia={data.toISOString()}
              className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2 border-b border-border/40 py-1.5 last:border-b-0"
            >
              <div className="flex flex-col items-center leading-none">
                <span
                  className={cn(
                    'text-[8.5px] font-semibold uppercase tracking-[0.1em]',
                    ehHoje ? 'text-primary' : 'text-muted-foreground/80'
                  )}
                >
                  {abreviacaoDiaSemana(data)}
                </span>
                <span
                  className={cn(
                    'mt-1 flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-[12px] font-semibold tabular-nums',
                    ehHoje ? 'bg-primary/15 text-primary' : 'text-foreground/90'
                  )}
                >
                  {numeroDia(data)}
                </span>
              </div>

              <div className="min-w-0">
                {visiveis.length === 0 ? (
                  <p className="py-1 text-[9.5px] leading-snug text-muted-foreground/70">
                    Nenhuma turma agendada para este dia.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {visiveis.map((turma) => {
                      const horario = turma.hora
                        ? turma.horaFim
                          ? `${turma.hora} – ${turma.horaFim}`
                          : turma.hora
                        : null;
                      const detalhe = [horario, turma.local].filter(Boolean).join(' · ');

                      return (
                        <button
                          key={turma.id}
                          type="button"
                          onClick={() => onAbrir(turma)}
                          title={`${turma.cursoNome}${detalhe ? ` · ${detalhe}` : ''}`}
                          data-agenda-evento={turma.id}
                          className="group flex w-full min-w-0 items-center gap-1.5 rounded-md border border-border/40 bg-background/50 px-1.5 py-1 text-left transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span
                            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PONTO_STATUS[turma.statusInfo.tom])}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate text-[10px] font-semibold text-foreground">
                              {turma.cursoNome}
                            </span>
                            {detalhe ? (
                              <span className="mt-0.5 block truncate text-[9px] text-muted-foreground">{detalhe}</span>
                            ) : null}
                          </span>
                          <ArrowRight
                            className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </button>
                      );
                    })}
                    {excedente > 0 && (
                      <TurmasDoDiaPopover
                        data={data}
                        turmas={turmasDoDia}
                        onAbrir={onAbrir}
                        rotulo={`+${excedente} ${excedente === 1 ? 'outra turma' : 'outras turmas'}`}
                        className="px-1 text-[9px] leading-tight text-muted-foreground hover:text-foreground hover:underline"
                      />
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {onVerCalendarioCompleto ? (
        <div className="mt-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onVerCalendarioCompleto(dataCalendario)}
            className="h-9 w-full justify-center gap-2 rounded-lg border-border/60 bg-background/40 text-[11.5px] font-medium text-foreground/90 hover:border-primary/35 hover:bg-primary/5 hover:text-foreground"
          >
            Ver calendário completo
            <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </Button>
        </div>
      ) : null}
    </motion.section>
  );
}
