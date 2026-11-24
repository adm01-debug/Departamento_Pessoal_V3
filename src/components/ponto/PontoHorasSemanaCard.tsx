/**
 * @fileoverview Card "Horas Trabalhadas" (série de 7 dias) do Controle de Ponto
 * (3ª linha, coluna esquerda).
 *
 * Consome os mesmos `registros_ponto` da página e monta a série diária em
 * HORAS DECIMAIS — formato numérico que o eixo do Recharts entende. O rótulo
 * legível (`HH:MM`) vai no tooltip, via `TooltipGrafico` (a régua de tooltip do
 * Design System, sem translate animado).
 *
 * Dias sem registro NÃO entram na série: barra vazia pareceria "zero hora
 * trabalhada", quando na verdade não houve apuração daquele dia. A linha
 * horizontal é a meta diária que o card já usava para pintar a barra cheia
 * (8h) — não é valor de vitrine.
 *
 * BARRAS: a linguagem visual é a do card "2. Visualize o impacto"
 * (`premiacoes/RewardsSimulator.tsx`) — preenchimento translúcido (20%), mesmo
 * matiz no contorno com 1,5px e topo arredondado. As CORES continuam as do
 * card: `--success` para dia completo e `--primary` (verde-lima) para dia
 * parcial; laranja e verde financeiros do simulador não entram aqui.
 *
 * CRESCIMENTO: as colunas sobem da base (altura 0 → altura real), uma depois da
 * outra, com a coreografia do simulador (`ui/crescimentoBarras.ts` → 900 ms por
 * barra, 100 ms de intervalo, ease-in-out senoidal). O eixo, os rótulos, a
 * linha de meta e o tooltip NÃO animam — só o `<rect>` de cada barra. A
 * animação parte quando a entrada do card termina e não se repete em hover,
 * tooltip ou troca de dado. A barra sob o cursor ganha o destaque (`activeBar`):
 * preenchimento um pouco mais denso e contorno de 2,5px.
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
  type BarShapeProps,
} from 'recharts';
import { TooltipGrafico, CLASSE_ENTRADA_TOOLTIP } from '@/components/ui/tooltipGrafico';
import { estiloCrescimentoBarra, useCrescimentoBarras } from '@/components/ui/crescimentoBarras';
import { slotSequencial } from '@/components/ui/entradaGlobal';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { cn } from '@/lib/utils';
import { formatarMinutosDuracao, horasDecimaisDeMinutos, minutosDeDuracao } from '@/utils/pontoDuracao';
import { ACAO_CARD_LIME } from './acoesCardsPonto';

/** Posição deste card na fila de entrada (o MESMO número do `custom`). */
const SLOT_ENTRADA_CARD = 10;

/**
 * Acabamento das colunas — os MESMOS números do simulador: 20% de preenchimento
 * translúcido e 1,5px de contorno no mesmo matiz. No destaque (barra ativa) o
 * preenchimento sobe para 34% e o contorno para 2,5px, sem trocar de cor.
 */
const BARRA_PREENCHIMENTO = 0.2;
const BARRA_CONTORNO = 1.5;
const BARRA_DESTAQUE_PREENCHIMENTO = 0.34;
const BARRA_DESTAQUE_CONTORNO = 2.5;

/**
 * Barra do gráfico — o Recharts calcula a geometria FINAL (`x`, `y`, `width`,
 * `height`); o visual (translúcido + contorno) e o crescimento vertical moram
 * aqui.
 *
 * O crescimento NÃO é animado neste componente: o `<rect>` apenas lê a variável
 * CSS escrita pelo controlador do contêiner (`useCrescimentoBarras`), então um
 * redesenho do Recharts (hover, tooltip, refetch) herda o progresso atual em vez
 * de reiniciar a subida. Só as barras mudam de geometria por causa do
 * `transform` — eixo, rótulos e linha de meta seguem estáveis.
 */
function BarraHoras({
  index = 0,
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  radius,
  fill,
  stroke,
  fillOpacity,
  strokeWidth,
  destacada = false,
}: BarShapeProps & { destacada?: boolean }) {
  const cor = typeof fill === 'string' ? fill : 'hsl(var(--primary))';
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      radius={radius}
      fill={cor}
      fillOpacity={destacada ? BARRA_DESTAQUE_PREENCHIMENTO : (fillOpacity ?? BARRA_PREENCHIMENTO)}
      stroke={typeof stroke === 'string' ? stroke : cor}
      strokeOpacity={1}
      strokeWidth={destacada ? BARRA_DESTAQUE_CONTORNO : (strokeWidth ?? BARRA_CONTORNO)}
      style={estiloCrescimentoBarra(index)}
    />
  );
}

/** Recorte de `registros_ponto` que este gráfico plota. */
interface RegistroDia {
  data?: string | null;
  horas_trabalhadas?: string | null;
}

interface PontoHorasSemanaCardProps {
  registrosSemana?: RegistroDia[];
  /** Abre o relatório completo de horas (aba de gestão). */
  onVerRelatorio?: () => void;
}

/** Jornada diária cheia — usada na meta (linha) e na cor da barra (8h = dia completo). */
const MINUTOS_JORNADA_CHEIA = 8 * 60;
const META_HORAS = MINUTOS_JORNADA_CHEIA / 60;

/** Ticks do eixo Y (horas) — mesma régua da referência, em passos de 3h. */
const TICKS_HORAS = [0, 3, 6, 9, 12];

/** `pt-BR` devolve o dia da semana em minúsculas; o cabeçalho da tooltip começa maiúsculo. */
function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Conteúdo da tooltip: duas linhas, nada mais.
 *
 * Antes o card usava o conteúdo PADRÃO do Recharts (`formatter` + `contentStyle`):
 * o bloco herdava a fonte do card (20px), pintava o texto de preto e crescia para
 * ~200×90 — cobria metade do gráfico. Aqui o conteúdo é próprio e compacto:
 * data no cabeçalho, indicador verde + rótulo + valor na linha de baixo.
 *
 * Entra pela MESMA régua dos demais gráficos (`CLASSE_ENTRADA_TOOLTIP`, só
 * opacidade — a posição não anima, ver `ui/tooltipGrafico.tsx`). As medidas são
 * em `rem` para acompanharem a escala global do Design System (base 20px):
 * `0.5rem` = 10px de raio, `0.625rem` = 12,5px de padding.
 */
function TooltipHorasTrabalhadas({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0]?.payload;
  if (!ponto) return null;

  return (
    <div
      className={cn(
        'rounded-[0.5rem] border border-border/70 bg-background px-2.5 py-2 shadow-lg',
        CLASSE_ENTRADA_TOOLTIP
      )}
    >
      <p className="font-body text-[10px] font-medium leading-none text-muted-foreground">{ponto.dataLonga}</p>
      <div className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap">
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
        <span className="font-body text-[10px] leading-none text-muted-foreground">Horas trabalhadas</span>
        <span className="font-display text-[12px] font-semibold leading-none tabular-nums text-foreground">
          {ponto.rotulo}
        </span>
      </div>
    </div>
  );
}

export function PontoHorasSemanaCard({ registrosSemana = [], onVerRelatorio }: PontoHorasSemanaCardProps) {
  const { serie, totalMinutos } = useMemo(() => {
    const porDia = new Map<string, number>();

    registrosSemana.forEach((registro) => {
      const data = registro?.data;
      if (!data) return;
      porDia.set(data, (porDia.get(data) ?? 0) + minutosDeDuracao(registro?.horas_trabalhadas ?? null));
    });

    const ordenado = [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7);

    return {
      serie: ordenado.map(([data, minutos]) => {
        const dia = new Date(`${data}T12:00:00`);
        return {
          // Rótulo do eixo: dia da semana + data (ex.: "Qui 03/10").
          eixo: `${dia.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')} ${dia.toLocaleDateString(
            'pt-BR',
            { day: '2-digit', month: '2-digit' }
          )}`,
          // Cabeçalho da tooltip: dia da semana por extenso + data (ex.: "Terça-feira, 03/11").
          dataLonga: capitalizar(
            dia.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
          ),
          horas: horasDecimaisDeMinutos(minutos),
          rotulo: formatarMinutosDuracao(minutos),
          completa: minutos >= MINUTOS_JORNADA_CHEIA,
        };
      }),
      totalMinutos: ordenado.reduce((soma, [, minutos]) => soma + minutos, 0),
    };
  }, [registrosSemana]);

  // Cascata das barras: só começa quando a entrada do card termina
  // (`onAnimationComplete`), uma única vez. `refGrafico` é o contêiner onde o
  // controlador escreve `--crescimento-barra-<i>` — os `<rect>` do Recharts
  // herdam dali, então recriá-los no hover não reinicia nada.
  const reduzirMovimento = useMovimentoReduzido();
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(SLOT_ENTRADA_CARD, slotSequencial);
  const refGrafico = useCrescimentoBarras({
    total: serie.length,
    ativo: entradaConcluida,
    reduzir: reduzirMovimento,
  });

  return (
    <motion.div
      custom={SLOT_ENTRADA_CARD}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onAnimationComplete={aoConcluirEntrada}
      className="h-full"
    >
      <Card className="border border-border/40 shadow-xs rounded-xl overflow-hidden h-full flex flex-col">
        <CardContent className="p-3 flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <BarChart3 className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold leading-tight">
              Horas Trabalhadas
            </p>
            {onVerRelatorio && (
              /* Ação secundária do card: rótulo e seta em lime (`ACAO_CARD_LIME`
                 — geometria/tipografia/posição e véu de hover preservados; o
                 `<ArrowRight>` herda o `currentColor` do botão). */
              <Button size="sm" variant="ghost" className={ACAO_CARD_LIME} onClick={onVerRelatorio}>
                Ver relatório
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 min-w-0">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground leading-none truncate">
              Últimos 7 dias
            </p>
            {serie.length > 0 && (
              <p className="shrink-0 text-[10px] font-display font-semibold tabular-nums leading-none">
                {formatarMinutosDuracao(totalMinutos)}
              </p>
            )}
          </div>

          {serie.length > 0 ? (
            <div ref={refGrafico} className="mt-1 h-[145px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie} margin={{ top: 12, right: 4, left: -18, bottom: 0 }} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis dataKey="eixo" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    ticks={TICKS_HORAS}
                    tickFormatter={(valor: number) => `${valor}h`}
                  />
                  <ReferenceLine
                    y={META_HORAS}
                    stroke="hsl(var(--warning))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{
                      value: `Meta (${META_HORAS}h)`,
                      position: 'insideTopRight',
                      fontSize: 9,
                      fill: 'hsl(var(--muted-foreground))',
                    }}
                  />
                  <TooltipGrafico content={<TooltipHorasTrabalhadas />} cursor={{ fill: 'hsl(var(--muted) / 0.35)' }} />
                  {/* `isAnimationActive={false}`: quem anima a altura é o
                      `scaleY` do `<rect>` (controlador acima). Deixar a
                      animação nativa do Recharts ligada somaria duas subidas no
                      mesmo desenho. O `Cell` continua definindo a cor de cada
                      dia; o formato (translúcido + contorno) vem do `shape`. */}
                  <Bar
                    dataKey="horas"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                    fillOpacity={BARRA_PREENCHIMENTO}
                    strokeWidth={BARRA_CONTORNO}
                    isAnimationActive={false}
                    shape={(props) => <BarraHoras {...props} />}
                    activeBar={(props) => <BarraHoras {...props} destacada />}
                  >
                    {serie.map((entrada, indice) => (
                      <Cell
                        key={`barra-${indice}`}
                        fill={entrada.completa ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                        stroke={entrada.completa ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-1 flex h-[145px] items-center justify-center rounded-lg border border-dashed border-border/60">
              <p className="text-[11px] text-muted-foreground font-body">Sem registros nos últimos 7 dias.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
