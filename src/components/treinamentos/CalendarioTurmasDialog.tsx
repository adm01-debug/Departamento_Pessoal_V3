import { useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, isSameDay, startOfMonth, subMonths } from 'date-fns';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PONTO_STATUS } from './statusTurmaVisual';
import { TurmasDoDiaPopover } from './TurmasDoDiaPopover';
import { TreinamentosCascadeDialog, TreinamentosCascadeItem } from './TreinamentosCascadeDialog';
import { abreviacaoDiaSemana, inicioSemana, numeroDia, somarDias, type Turma } from './turmasDerivacoes';

/**
 * ============================================================================
 * CALENDÁRIO MENSAL DE TURMAS — visão completa aberta pela agenda semanal.
 *
 * FONTE ÚNICA: recebe `turmas` já carregadas por `TreinamentosPage` (as mesmas
 * que alimentam a agenda, respeitando os filtros do painel). Nenhuma consulta
 * nova, nenhuma escrita e nenhuma rota inventada.
 *
 * AÇÃO REAL: cada turma do mês abre o `TurmaDetalheDialog` já existente, por
 * `onAbrirTurma`. O mês inicial é o da semana que a agenda está exibindo, para
 * o botão “Ver calendário completo” continuar a leitura de onde o usuário está.
 *
 * RESPONSIVIDADE: a grade de 7 colunas mostra até dois chips por dia a partir
 * de `sm`; abaixo disso, cada célula exibe o dia e pontos de status, e a lista
 * “Turmas do mês” (com nome, horário e local) aparece abaixo da grade.
 * ============================================================================
 */
export interface CalendarioTurmasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Semana exibida na agenda; o calendário abre no mês dela. */
  mesInicial: Date | null;
  turmas: readonly Turma[];
  onAbrirTurma: (turma: Turma) => void;
}

const MES_LONGO = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

function rotuloMes(data: Date): string {
  const texto = MES_LONGO.format(data);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function chaveDia(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
}

function detalheTurma(turma: Turma): string {
  return [turma.hora, turma.local].filter(Boolean).join(' · ');
}

function TurmaChip({ turma, onAbrir }: { turma: Turma; onAbrir: (turma: Turma) => void }) {
  const detalhe = detalheTurma(turma);
  return (
    <button
      type="button"
      data-calendario-turma={turma.id}
      onClick={() => onAbrir(turma)}
      title={`${turma.cursoNome}${detalhe ? ` · ${detalhe}` : ''}`}
      className="group flex w-full min-w-0 items-start gap-1 rounded border border-border/40 bg-background/70 px-1 py-0.5 text-left transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span
        className={cn('mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full', PONTO_STATUS[turma.statusInfo.tom])}
        aria-hidden
      />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[9px] font-medium text-foreground">{turma.cursoNome}</span>
        {detalhe ? <span className="mt-0.5 block truncate text-[8px] text-muted-foreground">{detalhe}</span> : null}
      </span>
    </button>
  );
}

export function CalendarioTurmasDialog({
  open,
  onOpenChange,
  mesInicial,
  turmas,
  onAbrirTurma,
}: CalendarioTurmasDialogProps) {
  const [mes, setMes] = useState(() => startOfMonth(mesInicial ?? new Date()));

  const dias = useMemo(() => {
    const inicio = inicioSemana(startOfMonth(mes));
    const fim = somarDias(inicioSemana(endOfMonth(mes)), 6);
    return eachDayOfInterval({ start: inicio, end: fim });
  }, [mes]);

  const porDia = useMemo(() => {
    const mapa = new Map<number, Turma[]>();
    for (const turma of turmas) {
      if (!turma.data) continue;
      const chave = chaveDia(turma.data);
      const lista = mapa.get(chave);
      if (lista) lista.push(turma);
      else mapa.set(chave, [turma]);
    }
    for (const lista of mapa.values()) {
      lista.sort(
        (a, b) =>
          (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') || a.cursoNome.localeCompare(b.cursoNome, 'pt-BR')
      );
    }
    return mapa;
  }, [turmas]);

  const turmasDoMes = useMemo(() => {
    const doMes = turmas.filter((turma): turma is Turma & { data: Date } =>
      Boolean(turma.data && turma.data.getFullYear() === mes.getFullYear() && turma.data.getMonth() === mes.getMonth())
    );
    return [...doMes].sort(
      (a, b) =>
        a.data.getTime() - b.data.getTime() ||
        (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') ||
        a.cursoNome.localeCompare(b.cursoNome, 'pt-BR')
    );
  }, [turmas, mes]);

  const primeiroDia = dias[0] ?? mes;
  const cabecalhos = Array.from({ length: 7 }, (_, indice) => abreviacaoDiaSemana(somarDias(primeiroDia, indice)));
  const hoje = new Date();

  return (
    <TreinamentosCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      blocks={turmasDoMes.length > 0 ? 4 : 3}
      className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-[900px] overflow-y-auto"
    >
      <TreinamentosCascadeItem>
        <DialogHeader>
          <div className="flex items-start gap-2 pr-8">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-info/25 bg-info/10 text-info">
              <CalendarDays className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-left text-base leading-tight">Calendário de turmas</DialogTitle>
              <DialogDescription className="text-left text-xs leading-relaxed">
                Visão mensal das turmas do painel, respeitando os filtros ativos. Clique em uma turma para abrir os
                detalhes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Mês anterior"
          onClick={() => setMes((atual) => subMonths(atual, 1))}
          className="h-8 w-8 rounded-lg"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-[12.5px] font-semibold text-foreground" aria-live="polite" data-calendario-mes>
          {rotuloMes(mes)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Próximo mês"
          onClick={() => setMes((atual) => addMonths(atual, 1))}
          className="h-8 w-8 rounded-lg"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border/50 bg-border/50">
          {cabecalhos.map((rotulo) => (
            <div
              key={rotulo}
              className="bg-muted/30 py-1 text-center text-[8.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
            >
              {rotulo}
            </div>
          ))}

          {dias.map((dia) => {
            const lista = porDia.get(chaveDia(dia)) ?? [];
            const foraDoMes = dia.getMonth() !== mes.getMonth();
            const ehHoje = isSameDay(dia, hoje);

            return (
              <div
                key={dia.toISOString()}
                data-calendario-dia={dia.toISOString()}
                className={cn(
                  'min-h-[74px] min-w-0 bg-background/80 p-1.5 sm:min-h-[92px]',
                  foraDoMes && 'bg-muted/20',
                  ehHoje && 'bg-primary/[0.04]'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10.5px] font-semibold tabular-nums',
                      ehHoje
                        ? 'bg-primary/15 text-primary'
                        : foraDoMes
                          ? 'text-muted-foreground/60'
                          : 'text-foreground/90'
                    )}
                  >
                    {numeroDia(dia)}
                  </span>
                  {lista.length > 0 ? (
                    <span className="text-[8.5px] leading-none tabular-nums text-muted-foreground sm:hidden">
                      {lista.length}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {lista.slice(0, 2).map((turma) => (
                    <TurmaChip key={turma.id} turma={turma} onAbrir={onAbrirTurma} />
                  ))}
                  {lista.length > 2 ? (
                    <TurmasDoDiaPopover
                      data={dia}
                      turmas={lista}
                      onAbrir={onAbrirTurma}
                      rotulo={`+${lista.length - 2} turma(s)`}
                      align="start"
                      className="px-1 text-[8.5px] leading-tight text-muted-foreground hover:text-foreground hover:underline"
                    />
                  ) : null}
                </div>

                <div className="mt-1 flex items-center gap-0.5 sm:hidden" aria-hidden>
                  {lista.slice(0, 3).map((turma) => (
                    <span key={turma.id} className={cn('h-1 w-1 rounded-full', PONTO_STATUS[turma.statusInfo.tom])} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {turmasDoMes.length === 0 ? (
          <p className="mt-2 text-center text-[10.5px] text-muted-foreground">Nenhuma turma neste mês.</p>
        ) : null}
      </TreinamentosCascadeItem>

      {turmasDoMes.length > 0 ? (
        <TreinamentosCascadeItem className="sm:hidden">
          <h4 className="text-[11px] font-semibold text-foreground">Turmas do mês</h4>
          <ul className="mt-2 flex flex-col gap-1.5" data-calendario-lista-mes>
            {turmasDoMes.map((turma) => {
              const detalhe = detalheTurma(turma);
              return (
                <li key={turma.id}>
                  <button
                    type="button"
                    data-calendario-turma={turma.id}
                    onClick={() => onAbrirTurma(turma)}
                    title={`${turma.cursoNome}${detalhe ? ` · ${detalhe}` : ''}`}
                    className="group flex w-full min-w-0 items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2 py-1.5 text-left transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex w-9 shrink-0 flex-col items-center leading-none">
                      <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {abreviacaoDiaSemana(turma.data)}
                      </span>
                      <span className="mt-0.5 text-[12px] font-semibold tabular-nums text-foreground">
                        {numeroDia(turma.data)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10.5px] font-semibold text-foreground">
                        {turma.cursoNome}
                      </span>
                      {detalhe ? (
                        <span className="mt-0.5 block truncate text-[9.5px] text-muted-foreground">{detalhe}</span>
                      ) : null}
                    </span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </TreinamentosCascadeItem>
      ) : null}
    </TreinamentosCascadeDialog>
  );
}
