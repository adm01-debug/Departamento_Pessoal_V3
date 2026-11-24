/**
 * @fileoverview Card "Jornada de Hoje" do Controle de Ponto (1ª linha, 2ª coluna).
 *
 * Diagramação (referência aprovada), em três faixas compactas:
 *  1. cabeçalho de duas linhas — ícone + título · ação "Ver dia completo" e,
 *     abaixo, data · atalho da escala · selo de atraso;
 *  2. linha do tempo horizontal — QUATRO círculos de 28px com UMA COR POR ETAPA
 *     (Entrada verde · Saída Almoço âmbar · Retorno Almoço azul · Saída roxo)
 *     ligados por um trilho de 2px que passa pelo centro dos círculos;
 *  3. dois indicadores lado a lado — "Tempo trabalhado" (rótulo, valor e meta à
 *     esquerda; anel de progresso de 60px à direita) e "Saldo do dia" em duas
 *     camadas: saldo principal (título, valor e selo do resultado) e,
 *     depois de uma divisória discreta, "Horas extras" e "Débito" em colunas.
 *
 * ENTRADA: a linha do tempo é revelada com a MESMA coreografia do "Histórico
 * Profissional" (`colaborador-detalhes/TrabalhoHierarquiaTab.tsx`), que mora em
 * `ui/timelineReveal.ts`: o trilho é DESENHADO da esquerda para a direita e os
 * quatro marcadores nascem em cascata, na ordem do dia (Entrada → Saída Almoço →
 * Retorno Almoço → Saída), com horário e rótulo descendo logo depois. É só
 * movimento: dimensões, posições, cores e espessuras continuam as aprovadas.
 *
 * ESCALA GLOBAL: o projeto renderiza a 125% (`html { font-size: 125% }` +
 * `scripts/postcss-escala-rem.mjs`), então as medidas escritas aqui em `px`/`rem`
 * aparecem 1,25× maiores na tela. Os valores abaixo miram o card de ~330px
 * reais em 1440px — a proporção da referência (largura/altura ≈ 1,36).
 *
 * ALTURA: o card acompanha a linha 1 da grade (`h-full`). A pequena diferença de
 * altura entre os três é absorvida pela faixa da linha do tempo (`flex-1` +
 * conteúdo centralizado) — assim não sobra faixa vazia no rodapé e os
 * indicadores não são inflados para "preencher" o card.
 *
 * A escala do dia não tem mais linha própria: ela é o `title`/`aria-label` do
 * lápis (que abre `EditarEscalaDialog`) e continua visível no diálogo. Uma faixa
 * só para o selo da escala custava ~30px e era o que empurrava o card para fora
 * da proporção da referência.
 *
 * Toda a leitura sai de `registros_ponto` do dia + da escala
 * (`escalas_trabalho → turnos`); nada aqui é valor de vitrine.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CalendarDays, Clock, Coffee, LogIn, LogOut, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { BARRA_PROGRESSO_DURACAO_S, BARRA_PROGRESSO_EASE } from '@/components/ui/progressMotion';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { turnoService } from '@/services/turnoService';
import { EditarEscalaDialog } from '@/components/ponto/EditarEscalaDialog';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { slotSequencial } from '@/components/ui/entradaGlobal';
import {
  atrasoMarcadorTimeline,
  propsInfoTimeline,
  propsMarcadorTimeline,
  propsTracoTimeline,
  type RitmoTimeline,
} from '@/components/ui/timelineReveal';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { VERMELHO_BORDA_SUAVE, VERMELHO_FUNDO, VERMELHO_TEXTO, VERMELHO_TRACO } from './vermelhoVibrante';
import { PALETA_ETAPAS_JORNADA } from './jornadaEtapas';
import { formatarMinutosDuracao, minutosDeDuracao } from '@/utils/pontoDuracao';

interface PontoTodayCardProps {
  registroHoje: any;
  colaboradorId: string;
  colaboradorNome?: string;
  empresaId?: string;
  /** Atalho real para o detalhamento do dia na aba de gestão. */
  onVerDiaCompleto?: () => void;
}

/** Marco da linha do tempo do dia (Entrada → Saída Almoço → Retorno → Saída). */
interface EtapaJornada {
  rotulo: string;
  /** `HH:MM` da batida real, ou `null` quando a etapa ainda não aconteceu. */
  hora: string | null;
  estado: 'cumprida' | 'atual' | 'pendente' | 'futura';
}

/**
 * Perímetro do anel de progresso — `2πr`, com `r = 20` num viewBox de 45.
 *
 * O raio encolheu de propósito: antes era `r = 17` num viewBox de 34 com traço
 * de 4 — o traço ia de 15 a 19 unidades, mas o viewBox só cobria até 17. Ou
 * seja, METADE do traço ficava fora da área pintada e o anel aparecia cortado
 * nas laterais (o defeito relatado no card). Agora `r + traço/2 = 22,5` = a
 * metade exata do viewBox (45/2), então o anel inteiro é desenhado.
 *
 * O SVG é dimensionado por CSS (`36px` e `45px` via container query) e o
 * viewBox escala tudo junto — traço e raio ficam proporcionais e nunca
 * distorcem, qualquer que seja o tamanho renderizado.
 */
const RAIO_ANEL = 20;
const PERIMETRO_ANEL = 2 * Math.PI * RAIO_ANEL;

/** Traço do anel em unidades do viewBox (proporcional ao tamanho via CSS). */
const TRACO_ANEL = 5;

/** Ícone de cada marco, na ordem real das colunas de `registros_ponto`. */
const ICONES_ETAPA = [LogIn, Coffee, Coffee, LogOut] as const;

/**
 * Ritmo da cascata da linha do tempo — os MESMOS números do "Histórico
 * Profissional" (`ui/timelineReveal.ts`, a fonte única: traço `scaleX` 0→1 em
 * 1,8 s `linear`, marcador "de dentro para fora" em 0,52 s com overshoot,
 * informações 14 px acima descendo em 0,56 s, 0,16 s depois do marcador).
 *
 * Quatro marcos = 3 passos. Aqui o trilho começa e termina no CENTRO do 1º e do
 * 4º círculo (`left/right: 12.5%`, meia coluna de quatro), então o último
 * marcador cai no FIM do traço — fração 1. O passo derivado é
 * `(1,8 s × 1) / 3 = 0,6 s`: o "lápis" chega em cada círculo exatamente no
 * instante em que ele nasce (no Histórico a fração é 0,84 porque lá o traço
 * sobra depois do 4º marcador).
 */
const RITMO_JORNADA: RitmoTimeline = { passos: 3, fracaoUltimoMarcador: 1 };

/**
 * Posição do card na fila de entrada do sistema (`custom` do `motion.div` da
 * casca). É o MESMO número entregue a `useEntradaCardConcluida`, que só então
 * libera a cascata interna — delay 5 × 120 ms + 520 ms de entrada.
 */
const SLOT_ENTRADA_CARD = 5;

/**
 * Minutos → `8h 02min` (leitura do card). Diferente de
 * `formatarMinutosDuracao`, que devolve `HH:MM` para saldos e tabelas: aqui o
 * número é "quanto já andou da jornada", e `8h 02min` lê melhor que `08:02`.
 */
function formatarHorasMinutos(minutos: number): string {
  const total = Math.max(0, Math.round(Number.isFinite(minutos) ? minutos : 0));
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return `${horas}h ${String(resto).padStart(2, '0')}min`;
}

function formatInterval(val: any) {
  if (!val) return '00:00';
  if (typeof val === 'string') {
    const match = val.match(/(\d+):(\d+)/);
    return match ? `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}` : '00:00';
  }
  return '00:00';
}

function timeToMinutes(time: string) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Capitaliza a primeira letra (date-fns/ptBR devolve dia da semana em minúsculas). */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function PontoTodayCard({
  registroHoje,
  colaboradorId,
  colaboradorNome,
  empresaId,
  onVerDiaCompleto,
}: PontoTodayCardProps) {
  const [editarEscalaAberto, setEditarEscalaAberto] = useState(false);
  const hojeStr = format(new Date(), 'yyyy-MM-dd');

  // ── Entrada da linha do tempo (MESMA coreografia do "Histórico
  // Profissional") ──────────────────────────────────────────────────────────
  // A cascata só parte quando a entrada do CARD termina de verdade: o
  // `onAnimationComplete` do `motion.div` da casca avisa e
  // `useEntradaCardConcluida` destrava (com rede de segurança no fim exato da
  // régua global, para o conteúdo nunca ficar invisível). Depois de destravada
  // a flag NÃO volta atrás — hover no card, atualização do relógio e refetch de
  // `registroHoje` não reiniciam a animação, porque os valores de `animate`
  // continuam os mesmos (o Framer só reexecuta quando o alvo muda).
  const reduzirMovimento = useMovimentoReduzido();
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(SLOT_ENTRADA_CARD, slotSequencial);
  const revelarJornada = reduzirMovimento || entradaConcluida;
  /** Atraso (s) de cada marco, na ordem em que o traço o alcança (0 → 3 passos). */
  const atrasoJornada = (posicao: number) => atrasoMarcadorTimeline(posicao, RITMO_JORNADA, reduzirMovimento);

  const { data: escalaHoje, isLoading: isLoadingEscala } = useQuery({
    queryKey: ['escala-hoje', colaboradorId, empresaId, hojeStr],
    queryFn: () => turnoService.obterEscalaDoDia(colaboradorId, empresaId!, hojeStr),
    enabled: !!colaboradorId && !!empresaId,
  });

  const progress = useMemo(() => {
    if (!registroHoje || !registroHoje.entrada_esperada || !registroHoje.saida_esperada) return 0;

    const startMins = timeToMinutes(registroHoje.entrada_esperada);
    const endMins = timeToMinutes(registroHoje.saida_esperada);
    const totalMins = endMins - startMins;

    if (totalMins <= 0) return 0;

    const workedMins = timeToMinutes(formatInterval(registroHoje.horas_trabalhadas));
    const p = (workedMins / totalMins) * 100;
    return Math.min(100, Math.max(0, p));
  }, [registroHoje]);

  const estimatedEndTime = useMemo(() => {
    if (!registroHoje || !registroHoje.entrada_1 || !registroHoje.entrada_esperada || !registroHoje.saida_esperada)
      return null;

    const [eh, em] = registroHoje.entrada_esperada.split(':').map(Number);
    const [sh, sm] = registroHoje.saida_esperada.split(':').map(Number);
    const expectedDurationMins = sh * 60 + sm - (eh * 60 + em);

    const [h1, m1] = registroHoje.entrada_1.split(':').map(Number);
    const startMins = h1 * 60 + m1;

    // Add lunch time if already taken or expected
    let lunchMins = 60; // default 1h
    if (registroHoje.saida_intervalo && registroHoje.retorno_intervalo) {
      const [sh_int, sm_int] = registroHoje.saida_intervalo.split(':').map(Number);
      const [rh_int, rm_int] = registroHoje.retorno_intervalo.split(':').map(Number);
      lunchMins = rh_int * 60 + rm_int - (sh_int * 60 + sm_int);
    }

    const totalDurationMins = startMins + expectedDurationMins + lunchMins;
    const endH = Math.floor(totalDurationMins / 60) % 24;
    const endM = totalDurationMins % 60;

    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }, [registroHoje]);

  // Linha do tempo horizontal: quatro marcos fixos, um por coluna real de
  // `registros_ponto` (`entrada_1`, `saida_intervalo`, `retorno_intervalo`,
  // `saida_1`) — o mesmo conjunto que `pontoSchema` valida.
  const etapas = useMemo(() => {
    if (!registroHoje) return [] as EtapaJornada[];

    const hora = (valor?: string | null) => (valor ? String(valor).slice(0, 5) : null);

    const marcos: Omit<EtapaJornada, 'estado'>[] = [
      { rotulo: 'Entrada', hora: hora(registroHoje.entrada_1) },
      { rotulo: 'Saída Almoço', hora: hora(registroHoje.saida_intervalo) },
      { rotulo: 'Retorno Almoço', hora: hora(registroHoje.retorno_intervalo) },
      { rotulo: 'Saída', hora: hora(registroHoje.saida_1) },
    ];

    // A última etapa preenchida é a posição atual da jornada; a seguinte é a
    // que está sendo aguardada. O resto ainda não aconteceu.
    const ultimaPreenchida = marcos.reduce((ultimo, marco, indice) => (marco.hora ? indice : ultimo), -1);

    return marcos.map((marco, indice): EtapaJornada => {
      if (marco.hora) return { ...marco, estado: indice === ultimaPreenchida ? 'atual' : 'cumprida' };
      return { ...marco, estado: indice === ultimaPreenchida + 1 ? 'pendente' : 'futura' };
    });
  }, [registroHoje]);

  const hojeFormatado = capitalize(format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }));

  /**
   * Escala do dia em texto (a mesma que antes ocupava uma linha própria no
   * card). Agora ela é o rótulo do lápis e o valor inicial do diálogo de
   * edição — o card não tem altura para uma faixa só dela sem sair da
   * proporção da referência.
   */
  const textoEscala = escalaHoje?.turno
    ? `Escala ${escalaHoje.turno.horario_inicio.slice(0, 5)} - ${escalaHoje.turno.horario_fim.slice(0, 5)}`
    : 'Escala não definida';

  const percentualJornada = Math.round(progress);
  const minutosTrabalhados = minutosDeDuracao(registroHoje?.horas_trabalhadas ?? null);
  const minutosExtras = minutosDeDuracao(registroHoje?.horas_extras ?? null);
  const minutosDevidos = minutosDeDuracao(registroHoje?.horas_falta ?? null);
  const saldoDia = minutosExtras - minutosDevidos;
  const emIntervalo = !!registroHoje?.saida_intervalo && !registroHoje?.retorno_intervalo;

  /** Jornada prevista do dia = `saida_esperada − entrada_esperada` (mesma fonte do anel). */
  const minutosPrevistosDia = (() => {
    if (!registroHoje?.entrada_esperada || !registroHoje?.saida_esperada) return 0;
    const total = timeToMinutes(registroHoje.saida_esperada) - timeToMinutes(registroHoje.entrada_esperada);
    return total > 0 ? total : 0;
  })();

  /** Leitura do saldo do dia em cor: vermelho no débito, verde no crédito, neutro no zero. */
  const corSaldo = saldoDia < 0 ? VERMELHO_TEXTO : saldoDia > 0 ? 'text-success' : 'text-muted-foreground';

  /**
   * Selo do resultado — três estados derivados de `saldoDia`, nunca de valor
   * fixo: crédito (Positivo), débito (Negativo) e zerado (neutro, sem semântica
   * de crédito/débito). O verde usa a variante `success` do próprio `Badge`;
   * o vermelho usa as tintas do módulo (`vermelhoVibrante`), que é a fonte
   * única do vermelho vibrante desta página; o neutro usa `muted`.
   */
  const seloSaldo =
    saldoDia > 0
      ? { rotulo: 'Positivo', variante: 'success' as const, classe: 'border-success/30 text-success' }
      : saldoDia < 0
        ? {
            rotulo: 'Negativo',
            variante: 'outline' as const,
            classe: cn(VERMELHO_BORDA_SUAVE, VERMELHO_FUNDO, VERMELHO_TEXTO),
          }
        : {
            rotulo: 'Zerado',
            variante: 'outline' as const,
            classe: 'border-border/60 bg-muted/40 text-muted-foreground',
          };

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
        <CardContent className="p-3 flex flex-1 flex-col @container">
          {/* 1ª linha — ícone + título à esquerda, ação "Ver dia completo" à direita. */}
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-info/15 text-info">
              <CalendarDays className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold leading-tight">
              Jornada de Hoje
            </p>
            {onVerDiaCompleto && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 shrink-0 rounded-lg border-info/40 bg-info/10 px-2 font-body text-[10px] font-medium text-info hover:bg-info/20 hover:text-info"
                onClick={onVerDiaCompleto}
              >
                Ver dia completo
              </Button>
            )}
          </div>

          {/* 2ª linha — data · atalho de edição da escala · selo de atraso, tudo
              na MESMA linha. Era aqui que existia uma terceira linha só para o
              selo da escala; ela saiu para o card caber na altura da referência,
              e a escala continua acessível no lápis (`title`/`aria-label`), no
              diálogo de edição e no horário previsto dos indicadores abaixo. */}
          <div className="mt-2 flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-[10px] font-body text-muted-foreground">{hojeFormatado}</span>
            {!isLoadingEscala && colaboradorId && empresaId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label={`Editar escala do dia (${textoEscala})`}
                title={textoEscala}
                onClick={() => setEditarEscalaAberto(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {emIntervalo && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-warning/20 bg-warning/10 px-1.5 text-[8px] font-medium uppercase tracking-wide text-warning">
                <Coffee className="h-2.5 w-2.5" />
                Em Intervalo de Almoço
              </span>
            )}
            {registroHoje?.atraso_minutos > 0 && (
              <Badge
                variant="warning"
                className="ml-auto shrink-0 gap-1 rounded-full border border-warning/30 px-1.5 py-0 text-[10px]"
              >
                <AlertTriangle className="h-3 w-3" />
                Atraso · {registroHoje.atraso_minutos} min
              </Badge>
            )}
          </div>

          {colaboradorId && empresaId && (
            <EditarEscalaDialog
              open={editarEscalaAberto}
              onOpenChange={setEditarEscalaAberto}
              colaboradorId={colaboradorId}
              colaboradorNome={colaboradorNome}
              empresaId={empresaId}
              data={hojeStr}
              escalaAtual={escalaHoje || null}
            />
          )}

          {registroHoje ? (
            <>
              {/* Linha do tempo do dia — faixa compacta: círculos de 28px, o
                  horário logo abaixo do ícone e o nome do evento por último.
                  `flex-1` + `justify-center` aqui absorve a pequena diferença de
                  altura da linha para o card não ficar com faixa vazia.

                  ENTRADA (mesma do "Histórico Profissional", ver
                  `ui/timelineReveal.ts`): o trilho é DESENHADO da esquerda para
                  a direita e cada círculo nasce "de dentro para fora" no
                  instante em que o traço o alcança — Entrada (verde) → Saída
                  Almoço (âmbar) → Retorno Almoço (azul) → Saída (roxo) —, com o
                  horário e o rótulo descendo logo depois. Só movimento: o traço
                  é `scaleX`/`opacity` e os textos usam `transform`, então
                  NENHUMA posição, medida ou altura do card muda. */}
              <div className="mt-2.5 flex flex-1 flex-col justify-center">
                <div className="relative">
                  {/* Trilho: começa no centro do 1º círculo e termina no do 4º
                      (`12.5%` = meia coluna de quatro) e corre na altura do
                      centro dos círculos de 28px → `top-[13px]` com 2px.
                      Mesmo elemento, mesmas classes: ele só é DESENHADO por
                      `scaleX` 0→1 ancorado à esquerda (movimento que não
                      ocupa espaço, logo nenhuma medida muda). */}
                  <motion.div
                    aria-hidden="true"
                    {...propsTracoTimeline(revelarJornada, reduzirMovimento)}
                    className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[13px] h-[2px] bg-border"
                  />
                  <div className="relative flex items-start">
                    {etapas.map((etapa, indice) => {
                      const Icone = ICONES_ETAPA[indice] ?? Clock;
                      const paleta = PALETA_ETAPAS_JORNADA[indice] ?? PALETA_ETAPAS_JORNADA[0];
                      // `cumprida`/`atual` têm batida registrada; `pendente`/`futura`
                      // mantêm a cor de identificação em tom discreto e exibem `--:--`.
                      const registrada = etapa.estado === 'cumprida' || etapa.estado === 'atual';
                      return (
                        <div key={etapa.rotulo} className="flex min-w-0 flex-1 flex-col items-center">
                          {/* Camada opaca: cobre o trilho atrás do círculo, cujo
                              fundo tonalizado é translúcido. `relative z-10`
                              mantém essa camada (e o círculo) ACIMA do trilho
                              animado — um elemento com `transform` passa a ser
                              pintado na camada de posicionados. Nenhuma classe
                              aqui afeta layout. */}
                          <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card">
                            {/* "De dentro para fora": escala 0→1 a partir do
                                centro, no instante em que o traço alcança este
                                marco. Sem `y` — o círculo não salta. */}
                            <motion.span
                              {...propsMarcadorTimeline(revelarJornada, atrasoJornada(indice))}
                              className={cn(
                                'grid h-7 w-7 place-items-center rounded-full border-2',
                                registrada ? paleta.registrada : paleta.discreta
                              )}
                            >
                              <Icone className="h-3.5 w-3.5" />
                            </motion.span>
                          </span>
                          {/* Horário e rótulo acompanham o marcador: fade +
                              descida de 14 px (`transform`, sem reflow) 0,16 s
                              depois de o círculo nascer. Cada um continua sendo
                              o MESMO item do flex, com os mesmos `mt-*` — por
                              isso a diagramação aprovada não muda. */}
                          <motion.span
                            {...propsInfoTimeline(revelarJornada, atrasoJornada(indice))}
                            className={cn(
                              'mt-1 text-[13px] font-display font-semibold leading-none tabular-nums',
                              etapa.hora ? 'text-foreground' : 'text-muted-foreground/60'
                            )}
                          >
                            {etapa.hora || '--:--'}
                          </motion.span>
                          <motion.span
                            {...propsInfoTimeline(revelarJornada, atrasoJornada(indice))}
                            className="mt-0.5 w-full text-center text-[10px] leading-tight whitespace-normal text-muted-foreground @[24rem]:whitespace-nowrap"
                          >
                            {etapa.rotulo}
                          </motion.span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Indicadores inferiores — duas colunas iguais (`minmax(0,1fr)`).
                  Abaixo de 17rem de container empilham (17rem × base de 20px =
                  340px reais; o corte antigo, 21rem = 420px, empilhava já em
                  1440px e era o que inflava a altura dos três cards).
                  `auto-rows-fr` mantém as duas caixas com a MESMA altura também
                  no empilhamento (lá cada uma vira uma linha do grid). */}
              <div className="mt-2.5 grid auto-rows-fr grid-cols-1 gap-2 @[17rem]:grid-cols-2">
                {/* ── Tempo trabalhado × anel de progresso ──
                    Duas áreas horizontais, como na referência: à esquerda o
                    rótulo, o valor e a meta do dia; à direita o anel. A coluna do
                    anel é `auto` com `shrink-0`, então o gráfico NUNCA é
                    comprimido — quem cede espaço é a coluna de texto
                    (`minmax(0,1fr)` + `min-w-0`), e o rótulo quebra em duas linhas
                    em vez de virar "Tempo trabalhad…". */}
                <div className="@container flex min-w-0 flex-col justify-center rounded-xl border border-border/40 bg-background/60 px-2 py-2.5">
                  <div className="flex min-w-0 items-center justify-between gap-1.5">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="min-w-0 text-[10px] leading-tight text-muted-foreground">Tempo trabalhado</span>
                      <span className="flex min-w-0 items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0 text-info" />
                        <span className="min-w-0 font-display text-[14px] font-semibold leading-none tabular-nums @[9rem]:text-[16px] @[12rem]:text-[17px]">
                          {formatarHorasMinutos(minutosTrabalhados)}
                        </span>
                      </span>
                      <span className="min-w-0 text-[9px] leading-none text-muted-foreground @[9rem]:text-[10px]">
                        de {formatarHorasMinutos(minutosPrevistosDia)}
                      </span>
                      {estimatedEndTime && !registroHoje.saida_1 && (
                        <span className="min-w-0 text-[9px] leading-none text-info @[9rem]:text-[10px]">
                          Prev. saída {estimatedEndTime}
                        </span>
                      )}
                    </div>

                    {/* Anel em três degraus (o viewBox é fixo, então o desenho
                        escala proporcional e continua redondo, sem corte): 48px
                        escritos = 60px reais — o alvo da referência — sempre que a
                        caixa tem 9rem (180px) ou mais de largura útil, 36px = 45px
                        reais na caixa média e 29px = 36px reais no aperto extremo.
                        Os cortes são medidos pela LARGURA ÚTIL da caixa (sem o
                        padding), porque é ela que a container query enxerga: só
                        desce o degrau quando o anel deixaria de caber ao lado do
                        valor sem quebrá-lo em duas linhas (foi medido: com 60px de
                        anel o card estreito de 1280px quebrava "0h 00min" e a
                        altura do card crescia 40px). O anel fica num `items-center`
                        com o grupo de textos, então o centro dele acompanha o
                        centro do grupo em qualquer altura. */}
                    <div className="relative h-[29px] w-[29px] shrink-0 @[6.5rem]:h-[36px] @[6.5rem]:w-[36px] @[9rem]:h-[48px] @[9rem]:w-[48px]">
                      <svg viewBox="0 0 45 45" className="h-full w-full -rotate-90" aria-hidden="true">
                        <circle
                          cx="22.5"
                          cy="22.5"
                          r={RAIO_ANEL}
                          fill="none"
                          strokeWidth={TRACO_ANEL}
                          className="stroke-muted"
                        />
                        {/* O anel é o preenchimento de progresso deste card: usa a
                            MESMA régua das barras (`progressMotion`) para o arco
                            crescer no tempo perceptível do resto do sistema — antes
                            da troca pela referência, este card já estava em
                            `BARRAS_MOTION` com `BARRA_PROGRESSO_DURACAO_S`. */}
                        <motion.circle
                          cx="22.5"
                          cy="22.5"
                          r={RAIO_ANEL}
                          fill="none"
                          strokeWidth={TRACO_ANEL}
                          strokeLinecap="round"
                          strokeDasharray={PERIMETRO_ANEL}
                          initial={{ strokeDashoffset: PERIMETRO_ANEL }}
                          animate={{ strokeDashoffset: PERIMETRO_ANEL * (1 - percentualJornada / 100) }}
                          transition={{ duration: BARRA_PROGRESSO_DURACAO_S, ease: BARRA_PROGRESSO_EASE }}
                          className={cn(progress > 100 ? VERMELHO_TRACO : 'stroke-success')}
                        />
                      </svg>
                      <span className="absolute inset-0 grid place-items-center font-display text-[8px] font-semibold tabular-nums @[7.5rem]:text-[9px] @[9rem]:text-[10px]">
                        {percentualJornada}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Saldo do dia ──
                    Duas camadas separadas por uma divisória discreta:
                    1. saldo principal — título na primeira linha; valor em
                       destaque e selo Positivo/Negativo/Zerado na segunda;
                    2. composição — "Horas extras" e "Débito" em duas colunas
                       iguais, cada uma com o rótulo acima do valor.
                    Tudo nasce de `saldoDia` (extras − falta): nenhum valor é
                    de vitrine. O selo é o `Badge` do design system — variante
                    `success` no crédito e `outline` com as tintas semânticas
                    nos demais —, então herda raio, borda e tipografia dos
                    selos do resto do sistema. */}
                <div className="flex min-w-0 flex-col justify-center rounded-xl border border-border/40 bg-background/60 px-2.5 py-2.5">
                  {/* Camada 1 · linha 1 — título da camada, sozinho na linha.
                      A linha não reserva espaço para ícone: a altura dela é a
                      do próprio texto (leading-tight), então o card mantém as
                      dimensões de antes da remoção da balança. */}
                  <span className="min-w-0 truncate text-[10px] leading-tight text-muted-foreground">Saldo do dia</span>

                  {/* Camada 1 · linha 2 — valor principal e selo do resultado. */}
                  <div className="mt-1 flex min-w-0 items-center justify-between gap-1.5">
                    <span
                      className={cn('min-w-0 font-display text-[16px] font-bold leading-none tabular-nums', corSaldo)}
                    >
                      {formatarMinutosDuracao(saldoDia, { sinal: true })}
                    </span>
                    <Badge
                      variant={seloSaldo.variante}
                      className={cn(
                        'shrink-0 rounded-full px-1.5 py-0 font-body text-[9px] font-medium leading-none',
                        seloSaldo.classe
                      )}
                    >
                      {seloSaldo.rotulo}
                    </Badge>
                  </div>

                  {/* Divisória de baixa opacidade entre as duas camadas. */}
                  <div className="mt-1 h-px w-full bg-border/40" aria-hidden="true" />

                  {/* Camada 2 — composição do saldo em duas colunas iguais.
                      Cada metade alinha à esquerda (rótulo em cima, valor
                      embaixo): nada fica solto nas extremidades do card. */}
                  <div className="mt-1 grid min-w-0 grid-cols-2 gap-x-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="min-w-0 text-[9px] leading-none text-muted-foreground">Horas extras</span>
                      <span className="mt-0.5 min-w-0 font-display text-[11px] font-semibold leading-none tabular-nums text-success">
                        {formatInterval(registroHoje.horas_extras)}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="min-w-0 text-[9px] leading-none text-muted-foreground">Débito</span>
                      <span
                        className={cn(
                          'mt-0.5 min-w-0 font-display text-[11px] font-semibold leading-none tabular-nums',
                          VERMELHO_TEXTO
                        )}
                      >
                        {formatInterval(registroHoje.horas_falta)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-2 text-center">
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Clock className="h-4 w-4" />
              </span>
              <p className="text-[12px] font-display font-medium text-foreground">A jornada ainda não começou</p>
              <p className="max-w-[200px] text-[9px] font-body leading-snug text-muted-foreground">
                Registre sua entrada no card de Registro de Ponto para iniciar o monitoramento.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
