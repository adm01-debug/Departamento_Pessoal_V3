/**
 * ============================================================================
 * TURNOS & ESCALAS — COLUNA LATERAL (3 cards, alinhados ao topo dos KPIs).
 * ============================================================================
 *
 *  1. TURNOS CADASTRADOS — lista compacta com a cor real de cada turno,
 *     horário, intervalo e seta; "Ver todos" abre o gerenciamento completo.
 *  2. RESUMO DO PERÍODO  — rosca com a distribuição das escalas por turno,
 *     total no centro e legenda ao lado (cor + nome + quantidade). Usa o
 *     `DonutChart` do sistema com `ANIMACAO_DONUT_CARD` — o MESMO traçado do
 *     card "Tipo de Vínculo" do Dashboard Executivo — e o mesmo portão de
 *     ciclo de vida (`useEntradaCardConcluida`): o gráfico só monta depois que
 *     a entrada do card terminou e os dados chegaram.
 *  3. PRÓXIMAS ESCALAS — datas futuras com escala (dados reais, janela de
 *     `DIAS_PROXIMAS_ESCALAS`); clicar numa data leva o calendário para aquele
 *     dia e "Ver todas" abre o modal completo (`DialogoProximasEscalas`), com a
 *     lista agrupada por data. O card continua sendo só o resumo de 5 linhas.
 *
 * Entradas: cards com `entradaConteudoGlobal` (a fila de conteúdo da régua
 * global) e linhas em cascata derivada dela (`turnosAnimacoes.ts`).
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MotionCard } from '@/components/ui/entrada-cards';
import { entradaConteudoGlobal } from '@/components/ui/entradaGlobal';
import { ANIMACAO_DONUT_CARD } from '@/components/dashboard/donutMotion';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { rotuloDiaMes, rotuloProximidade } from './turnosCalendario';
import { normalizarHex } from './turnosCores';
import { variantesLinhaCalendario } from './turnosAnimacoes';
import {
  faixaHoraria,
  formatarIntervaloMinutos,
  type DiaComEscalas,
  type FatiaTurno,
  type TurnoRegistro,
} from './turnosMetricas';

/** Casca comum dos três cards: mesma borda/raio/cabeçalho compacto. */
function CardLateral({
  slotCascata,
  titulo,
  acao,
  badge,
  className,
  children,
}: {
  slotCascata: number;
  titulo: string;
  acao?: React.ReactNode;
  badge?: React.ReactNode;
  /** Classe extra da casca — usada pelo ÚLTIMO card (ver `CardProximas`). */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <MotionCard
      data-entrada="cascata"
      custom={slotCascata}
      initial="hidden"
      animate="visible"
      variants={entradaConteudoGlobal}
      className={cn('overflow-hidden rounded-2xl border border-border/30', className)}
    >
      <CardHeader className="flex flex-row items-center gap-1.5 space-y-0 p-3 pb-2">
        <CardTitle className="min-w-0 flex-1 truncate text-[10px] font-semibold">{titulo}</CardTitle>
        {badge}
        {acao}
      </CardHeader>
      <CardContent className="p-2 pt-0">{children}</CardContent>
    </MotionCard>
  );
}

/** Botão "Ver todos" — lime, discreto, mesma altura nos dois cards. */
function AcaoVerTodos({ onClick, rotulo }: { onClick: () => void; rotulo: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
    >
      {rotulo}
      <ArrowRight className="h-2.5 w-2.5" aria-hidden />
    </button>
  );
}

/** Card 1 — Turnos cadastrados (lista compacta). */
function CardTurnos({
  turnos,
  slotCascata,
  onVerTodos,
  onAbrirTurno,
}: {
  turnos: readonly TurnoRegistro[];
  slotCascata: number;
  onVerTodos: () => void;
  onAbrirTurno: (turno: TurnoRegistro) => void;
}) {
  const reduzir = useMovimentoReduzido();

  return (
    <CardLateral
      slotCascata={slotCascata}
      titulo="Turnos cadastrados"
      badge={
        <Badge variant="secondary" className="h-5 min-w-5 justify-center px-0.5 text-[10px]">
          {turnos.length}
        </Badge>
      }
      acao={<AcaoVerTodos onClick={onVerTodos} rotulo="Ver todos" />}
    >
      {turnos.length === 0 ? (
        <p className="px-1 py-3 text-[13px] text-muted-foreground">Nenhum turno cadastrado.</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {turnos.slice(0, 6).map((turno, indice) => (
            <motion.li
              key={turno.id}
              custom={indice}
              variants={variantesLinhaCalendario}
              initial={reduzir ? false : 'oculto'}
              animate="visivel"
            >
              <button
                type="button"
                onClick={() => onAbrirTurno(turno)}
                className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-muted/30"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: normalizarHex(turno.cor) }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium leading-tight">{turno.nome}</span>
                  <span className="block truncate text-[10px] leading-tight tabular-nums text-muted-foreground">
                    {faixaHoraria(turno)} · {formatarIntervaloMinutos(turno.intervalo_minutos)}
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </CardLateral>
  );
}

/** Card 2 — Resumo do período (rosca + legenda com as cores reais). */
function CardResumo({
  distribuicao,
  titulo,
  slotCascata,
  carregando,
}: {
  distribuicao: readonly FatiaTurno[];
  titulo: string;
  slotCascata: number;
  carregando: boolean;
}) {
  // Portão de ciclo de vida do gráfico: só monta depois que a entrada do card
  // terminou (o arco precisa desenhar 100% visível) e com dados na mão.
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(slotCascata);
  const total = distribuicao.reduce((acc, fatia) => acc + fatia.total, 0);
  const semDados = carregando || !entradaConcluida || total === 0;

  return (
    <MotionCard
      data-entrada="cascata"
      custom={slotCascata}
      initial="hidden"
      animate="visible"
      variants={entradaConteudoGlobal}
      onAnimationComplete={aoConcluirEntrada}
      className="overflow-hidden rounded-2xl border border-border/30"
    >
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-3 pb-2">
        <CardTitle className="min-w-0 flex-1 truncate text-[10px] font-semibold">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        {semDados ? (
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="h-[96px] w-[96px] shrink-0 animate-pulse rounded-full border-[12px] border-muted"
            />
            <div aria-hidden className="flex min-w-0 flex-1 flex-col gap-1">
              {Array.from({ length: 3 }).map((_, indice) => (
                <div key={indice} className="h-5 animate-pulse rounded-full bg-muted/60" />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <DonutChart
              segments={distribuicao.map((fatia) => ({
                label: fatia.nome,
                value: fatia.total,
                color: normalizarHex(fatia.cor),
              }))}
              size={96}
              strokeWidth={12}
              showLegend={false}
              className="shrink-0"
              {...ANIMACAO_DONUT_CARD}
            />
            <ul className="min-w-0 flex-1 divide-y divide-border/40">
              {distribuicao.map((fatia, indice) => (
                <motion.li
                  key={fatia.turnoId}
                  custom={indice}
                  variants={variantesLinhaCalendario}
                  initial="oculto"
                  animate="visivel"
                  className="flex items-center gap-1.5 py-1 text-[10px] first:pt-0 last:pb-0"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: normalizarHex(fatia.cor) }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{fatia.nome}</span>
                  <span className="font-display font-medium tabular-nums">{fatia.total}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </MotionCard>
  );
}

/** Card 3 — Próximas escalas (datas reais, clicáveis). */
function CardProximas({
  dias,
  slotCascata,
  onSelecionarDia,
  onVerTodas,
}: {
  dias: readonly DiaComEscalas[];
  slotCascata: number;
  onSelecionarDia: (chave: string) => void;
  onVerTodas: () => void;
}) {
  const reduzir = useMovimentoReduzido();

  return (
    <CardLateral
      slotCascata={slotCascata}
      titulo="Próximas escalas"
      acao={<AcaoVerTodos onClick={onVerTodas} rotulo="Ver todas" />}
      // `flex-1`: se a coluna esquerda acabar mais alta que a soma destes três
      // cards (recorte com pouquíssimos turnos/escalas), é ESTE card que absorve
      // a sobra — assim a base da lateral continua na mesma linha da base do
      // calendário/lista. Com dados normais a lateral é quem dita a altura, não
      // há folga e este `flex-1` não muda nada.
      className="flex-1"
    >
      {dias.length === 0 ? (
        <p className="px-1 py-3 text-[13px] text-muted-foreground">Nenhuma escala programada.</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {dias.map((dia, indice) => (
            <motion.li
              key={dia.chave}
              custom={indice}
              variants={variantesLinhaCalendario}
              initial={reduzir ? false : 'oculto'}
              animate="visivel"
            >
              <button
                type="button"
                onClick={() => onSelecionarDia(dia.chave)}
                className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-muted/30"
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"
                  aria-hidden
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                  {rotuloProximidade(dia.chave)}, {rotuloDiaMes(dia.chave)}
                </span>
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {dia.total} {dia.total === 1 ? 'escala' : 'escalas'}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </CardLateral>
  );
}

export interface ColunaLateralTurnosProps {
  turnos: readonly TurnoRegistro[];
  distribuicao: readonly FatiaTurno[];
  /** "Resumo da semana" / "Resumo do mês" — segue a visão aberta. */
  tituloResumo: string;
  proximas: readonly DiaComEscalas[];
  carregando: boolean;
  onVerTodosTurnos: () => void;
  onAbrirTurno: (turno: TurnoRegistro) => void;
  onSelecionarDia: (chave: string) => void;
  onVerTodasEscalas: () => void;
  /** Slot do primeiro card na fila de conteúdo (KPIs ocupam 0–3). */
  slotInicial?: number;
}

/**
 * Coluna lateral completa. A ordem é a da referência: turnos, resumo do
 * período e próximas escalas — os três cards com entrada em cascata contínua
 * depois da faixa de KPIs.
 */
export function ColunaLateralTurnos({
  turnos,
  distribuicao,
  tituloResumo,
  proximas,
  carregando,
  onVerTodosTurnos,
  onAbrirTurno,
  onSelecionarDia,
  onVerTodasEscalas,
  slotInicial = 0,
}: ColunaLateralTurnosProps) {
  return (
    <aside className="flex flex-col gap-3">
      <CardTurnos turnos={turnos} slotCascata={slotInicial} onVerTodos={onVerTodosTurnos} onAbrirTurno={onAbrirTurno} />
      <CardResumo
        distribuicao={distribuicao}
        titulo={tituloResumo}
        slotCascata={slotInicial + 1}
        carregando={carregando}
      />
      <CardProximas
        dias={proximas}
        slotCascata={slotInicial + 2}
        onSelecionarDia={onSelecionarDia}
        onVerTodas={onVerTodasEscalas}
      />
    </aside>
  );
}
