/**
 * ============================================================================
 * TURNOS & ESCALAS — VISUALIZAÇÃO MENSAL.
 * ============================================================================
 *
 * Calendário do mês (Seg … Dom) com os MESMOS dados e filtros da semana — muda
 * só a forma de leitura:
 *
 *   • cada dia é uma CÉLULA de calendário: data, até três pontos nas cores
 *     REAIS dos turnos daquele dia e a quantidade de escalas;
 *   • clicar num dia abre o modal "Escalas do dia" — a lista que antes era
 *     despejada ABAIXO da grade saiu daqui. O clique não muda a altura da
 *     página: nenhuma seção extra é inserida, todo o detalhe vive no diálogo;
 *   • dia de hoje e dia aberto no modal têm estados DIFERENTES e identificáveis
 *     sem depender só da cor (etiqueta "Hoje", borda + anel do selecionado).
 *
 * Nenhuma agregação nova: usa `escalasPorDia` montado na página a partir das
 * escalas já filtradas. A cascata de entrada é a mesma do calendário semanal
 * (`turnosAnimacoes.ts`), aplicada nas células do mês.
 *
 * ── GEOMETRIA/ESTADOS DAS CÉLULAS ──────────────────────────────────────────
 * A grade antiga era quase invisível: célula `bg-background/20` sobre um card
 * também escuro, borda `border-border/30` e nenhuma diferença entre dia com e
 * sem escala. Agora:
 *
 *   normal       → `bg-background/40` + `border-border/50` (borda perceptível)
 *   com escalas  → borda mais forte (`border-border/70`) + tinta `bg-muted/25`
 *                  + quantidade escrita na célula
 *   hoje         → borda lime + tinta lime translúcida + data em `text-primary`
 *                  + etiqueta "Hoje" (o estado não é dito só pela cor)
 *   selecionado  → borda lime cheia + `ring-2` + `aria-pressed` (o anel é a
 *                  marca de forma que separa "aberto agora" de "hoje")
 *
 * ── ALTURA: A BASE DO CARD ENCOSTA NA BASE DA COLUNA LATERAL ───────────────
 * O card é `flex-1` e as SEMANAS são linhas de grid `minmax(0, 1fr)`: a sobra
 * de altura da coluna é dividida igualmente entre as linhas já existentes, e
 * as células crescem junto (nada de área vazia abaixo da última semana e nada
 * de inventar uma sexta linha). `contain: 'size'` é o que permite isso sem
 * efeito colateral: o card passa a NÃO contribuir com a altura do próprio
 * conteúdo para a linha da grade, ou seja, a coluna lateral (mais alta) é quem
 * define a altura da linha e o calendário ocupa exatamente o resto. Sem isso, o
 * `flex-1` só funcionaria enquanto o conteúdo fosse menor que a lateral — e o
 * `max-h` necessário para não estourar a página voltaria a desalinhar a base.
 * `min-h-[26rem]` é piso de usabilidade (telas baixas continuam com células
 * tocáveis), não número de alinhamento.
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { getDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMovimentoReduzido } from '@/lib/motionMode';
import {
  ehHoje,
  rotuloDataCompleta,
  rotuloDiaMes,
  rotuloDiaSemanaCompleto,
  type IntervaloPeriodo,
} from './turnosCalendario';
import { hexParaRgba, normalizarHex } from './turnosCores';
import { type EscalaRegistro, type TurnoRegistro } from './turnosMetricas';
import { variantesCelulaCalendario } from './turnosAnimacoes';
import { FUNDO_CARD } from './turnosSuperficies';

export interface CalendarioMensalProps {
  periodo: IntervaloPeriodo;
  /** Escalas filtradas do período, agrupadas por `yyyy-MM-dd`. */
  escalasPorDia: Map<string, EscalaRegistro[]>;
  turnos: readonly TurnoRegistro[];
  /** Dia aberto no modal (`yyyy-MM-dd`) — destaca a célula correspondente. */
  selecionado?: string | null;
  /** Clique num dia: a página abre o modal com as escalas daquela data. */
  onSelecionarDia: (dia: string) => void;
}

/** Colunas do mês, na ordem de segunda a domingo. */
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** `0` = segunda … `6` = domingo (o `getDay` do JS começa no domingo). */
function indiceDaSemana(chave: string): number {
  const [ano, mes, dia] = chave.slice(0, 10).split('-').map(Number);
  return (getDay(new Date(ano, mes - 1, dia)) + 6) % 7;
}

export function CalendarioMensal({
  periodo,
  escalasPorDia,
  turnos,
  selecionado = null,
  onSelecionarDia,
}: CalendarioMensalProps) {
  const reduzir = useMovimentoReduzido();

  const turnosPorId = new Map(turnos.map((turno) => [turno.id, turno]));
  const vazios = periodo.dias.length > 0 ? indiceDaSemana(periodo.dias[0]) : 0;
  /** Semanas do mês: `ceil((vazios + dias) / 7)` — o número REAL de linhas. */
  const semanas = Math.max(1, Math.ceil((vazios + periodo.dias.length) / 7));

  return (
    <div
      className={cn(
        'flex min-h-[26rem] flex-1 flex-col overflow-hidden rounded-2xl border border-border/40 p-2.5',
        FUNDO_CARD
      )}
      // Ver "ALTURA" no cabeçalho do arquivo: o card ocupa a sobra da coluna em
      // vez de ditar a altura da linha da grade.
      style={{ contain: 'size' }}
    >
      <div className="grid shrink-0 grid-cols-7 gap-1.5 border-b border-border/40 pb-1.5">
        {DIAS_SEMANA.map((dia, indice) => (
          <div
            key={dia}
            className={cn(
              'px-1 text-center text-[10px] font-medium',
              indice >= 5 ? 'text-muted-foreground' : 'text-foreground'
            )}
          >
            {dia}
          </div>
        ))}
      </div>

      <div
        className="mt-1.5 grid min-h-0 flex-1 grid-cols-7 gap-1.5"
        // Uma linha por SEMANA, todas com a mesma fração da altura disponível —
        // é o que faz as células crescerem junto com o card.
        style={{ gridTemplateRows: `repeat(${semanas}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: vazios }).map((_, indice) => (
          <div key={`vazio-${indice}`} aria-hidden />
        ))}

        {periodo.dias.map((dia, indiceColuna) => {
          const escalas = escalasPorDia.get(dia) ?? [];
          const hoje = ehHoje(dia);
          const ativo = selecionado === dia;
          const cores = [
            ...new Set(
              escalas.map((escala) => normalizarHex(turnosPorId.get(escala.turno_id)?.cor ?? escala.turno?.cor))
            ),
          ].slice(0, 3);

          return (
            <motion.button
              key={dia}
              type="button"
              custom={[0, indiceColuna] as [number, number]}
              variants={variantesCelulaCalendario}
              initial={reduzir ? false : 'oculto'}
              animate="visivel"
              onClick={() => onSelecionarDia(dia)}
              aria-pressed={ativo}
              aria-label={`${rotuloDiaSemanaCompleto(dia)} ${rotuloDataCompleta(dia)}: ${escalas.length} escala(s)${
                hoje ? ' — hoje' : ''
              }`}
              className={cn(
                // Base: célula de calendário — borda visível, tinta própria e
                // raio do DS. `transition-colors` só de cor: nada se desloca.
                // Sem `min-h` fixo: a altura vem da linha da grade (`1fr`), que
                // cresce com o card.
                'flex min-h-0 flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors duration-150 motion-reduce:transition-none',
                'border-border/50 bg-background/40 hover:border-primary/45 hover:bg-primary/5',
                // Dia com escala: borda mais presente + tinta leve de superfície.
                escalas.length > 0 && 'border-border/70 bg-muted/25',
                // Hoje: borda lime + tinta lime translúcida (data em destaque).
                hoje && 'border-primary/45 bg-primary/10',
                // Aberto no modal: borda lime cheia + anel (marca de forma).
                ativo && 'border-primary bg-primary/15 ring-2 ring-primary/30'
              )}
            >
              <span className="flex items-center justify-between gap-1">
                <span
                  className={cn('text-[11px] font-semibold tabular-nums', hoje ? 'text-primary' : 'text-foreground/85')}
                >
                  {rotuloDiaMes(dia)}
                </span>
                {hoje && (
                  <span className="rounded-full bg-primary/15 px-1 text-[9px] font-semibold leading-[1.5] text-primary">
                    Hoje
                  </span>
                )}
              </span>

              <span className="flex items-center gap-1" aria-hidden>
                {cores.map((cor) => (
                  <span
                    key={cor}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: hexParaRgba(cor, 1) }}
                  />
                ))}
              </span>

              <span className="mt-auto truncate text-[9px] tabular-nums text-muted-foreground">
                {escalas.length === 0
                  ? 'Sem escala'
                  : `${escalas.length} ${escalas.length === 1 ? 'escala' : 'escalas'}`}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
