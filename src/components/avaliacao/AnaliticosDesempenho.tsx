import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowRight, BarChart3, Star, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMovimentoReduzido } from '@/lib/motionMode';
import {
  gradienteProgresso,
  iniciais,
  limitarPercentual,
  normalizarStatus,
  progressoMeta,
  tintaProgresso,
} from './desempenhoComum';
import { EntradaPresenca, MAX_ENTRADA_INDEX, MotionCard, entradaCard } from './entradaCards';
import { BarraProgresso } from './barraProgresso';

/**
 * Classe do percentual central — 24 px (`text-2xl`), a medida da referência
 * aprovada: com o donut de 140 px, o número central precisa ser maior que os
 * 20 px anteriores para manter a hierarquia (número → rótulo) do desenho.
 */
const CLASSE_VALOR_DONUT = 'text-2xl font-display font-medium leading-none';

/**
 * Lado do donut, em px — espelha `h-[140px] w-[140px]` do container (o Tailwind
 * precisa do literal). Passado como `initialDimension` do `ResponsiveContainer`
 * para que o gráfico seja desenhado JÁ no primeiro render: com o padrão
 * (`{width:-1,height:-1}`) o Recharts só renderiza depois que o `ResizeObserver`
 * mede o container, e nesse intervalo o `Pie` monta, dispara `onAnimationStart`
 * e só desenha ~1 s depois — era essa a defasagem que fazia o percentual
 * terminar antes de o donut começar a ser desenhado.
 */
const DONUT_PX = 140;

/**
 * Percentual central — componente PRÓPRIO de propósito.
 *
 * A contagem muda de valor a cada quadro; se esse estado morasse no card, cada
 * quadro re-renderizaria o `Pie`, e no Recharts 3 isso REINICIA a animação:
 * `SectorsWithAnimation` passa `animationInput: props` (objeto novo a cada
 * render) ao `AnimatedItems`, que troca o `key` do animador e recomeça do zero
 * — o donut ficava parado enquanto a contagem rodava. Como componente separado,
 * o estado por quadro fica restrito a este `span` e o gráfico não é re-renderizado.
 */
function PercentualCentral({
  valor,
  ativo,
  reduzirMovimento,
}: {
  valor: number;
  ativo: boolean;
  reduzirMovimento: boolean;
}) {
  const texto = useContadorCentral(valor, ativo, reduzirMovimento);
  return <span className={CLASSE_VALOR_DONUT}>{texto}</span>;
}

/**
 * Contador do percentual central, comandado pelo MESMO gatilho do donut.
 *
 * Mesma mecânica do `AnimatedNumber` do Dashboard (rAF, `easeOutCubic`, só
 * inteiros na tela e o valor EXATO no último quadro), mas com o "0 ms" amarrado
 * ao `Pie`: o componente compartilhado inicia a contagem quando o PRÓPRIO span
 * entra na viewport, o que pode acontecer bem depois do desenho começar (ou
 * nunca, se o centro do donut ficar abaixo da dobra) — foi exatamente assim que
 * a contagem ficou parada em 0% e só apareceu o valor final. Nada do
 * `AnimatedNumber` é alterado: este card apenas não delega mais o disparo.
 */
function useContadorCentral(valor: number, ativo: boolean, reduzirMovimento: boolean): string {
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    if (!ativo) return;
    let raf = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const progresso = Math.min((agora - inicio) / ANIM_DONUT_MS, 1);
      const suave = 1 - Math.pow(1 - progresso, 3); // easeOutCubic
      // Último quadro: sempre o valor REAL (nada de arredondamento acumulado).
      setTexto(progresso < 1 ? `${Math.round(valor * suave)}%` : `${valor}%`);
      if (progresso < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [ativo, valor]);

  if (reduzirMovimento) return `${valor}%`;
  if (!ativo) return '0%';
  return texto ?? '0%';
}

/**
 * ============================================================================
 * ÁREA ANALÍTICA — três cards horizontais da Gestão de Desempenho.
 *
 * A. Feedbacks por Status  → donut + legenda (métrica REAL equivalente ao
 *    "Progresso das Avaliações" do mockup: a área não possui tabela de
 *    avaliações com estados próprios, então o donut usa o `status` real de
 *    `feedbacks_360` — concluído × pendente).
 * B. Distribuição das Notas → barras horizontais sobre `feedbacks_360.nota_geral`.
 * C. Metas do Ciclo (Top 5) → 5 maiores progressos dentre as metas do ciclo.
 * ============================================================================
 */

/** Botão discreto de ação no cabeçalho de cada card. */
function AcaoCard({ rotulo, onClick }: { rotulo: string; onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2 text-[11px] text-primary hover:text-primary-glow"
      onClick={onClick}
    >
      {rotulo}
      <ArrowRight className="h-3 w-3" />
    </Button>
  );
}

/**
 * Cabeçalho padrão dos três cards (mesma hierarquia visual).
 *
 * Paddings enxutos de propósito: `pt-2 pb-1` envolvem só os 24 px do slot do
 * ícone — o botão de ação (28 px) é quem manda na altura, então o cabeçalho fecha
 * em 40 px nos TRÊS cards (ícone alinhado ao título à esquerda, ação à direita),
 * como medido no navegador. Era `pt-3 pb-2` (48 px) — 8 px que, somados ao
 * padding vertical do conteúdo, deixavam os três cards visivelmente "esticados".
 *
 * O ícone NÃO tem mais chip/quadrado colorido (o fundo `bg-*` foi removido):
 * fica só o glifo, na cor da sua família (`corIcone` é apenas a cor agora) e um
 * pouco maior (18 px — o `h-4.5` do Tailwind). O slot continua com 24 px
 * (`h-6 w-6`, agora invisível) para o título começar exatamente na mesma coluna
 * dos outros dois cards e a altura do cabeçalho seguir os 40 px já calibrados.
 */
function CabecalhoCard({
  icone,
  corIcone,
  titulo,
  acao,
  onAcao,
}: {
  icone: React.ReactNode;
  corIcone: string;
  titulo: string;
  acao?: string;
  onAcao?: () => void;
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-1 pt-2">
      <CardTitle className="flex items-center gap-2 text-sm font-display font-medium">
        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center', corIcone)}>{icone}</span>
        {titulo}
      </CardTitle>
      {acao && <AcaoCard rotulo={acao} onClick={onAcao} />}
    </CardHeader>
  );
}

/**
 * ============================================================================
 * RÉGUA DA REVELAÇÃO DO CARD (a única fonte de verdade destes números).
 *
 * A sequência começa no instante em que o Recharts COMEÇA a desenhar o donut
 * (`onAnimationStart` do `Pie` — ver `CardFeedbacksPorStatus`): donut e
 * percentual central partem de 0 e correm os mesmos 1.400 ms; as três legendas
 * entram em cascata COM o desenho ainda em curso (250/430/610 ms, 550 ms cada).
 *
 *   Donut ............... 0 ms → 1400 ms
 *   Percentual central .. 0 ms → 1400 ms
 *   Concluídos .......... 250 ms → 800 ms
 *   Pendentes ........... 430 ms → 980 ms
 *   Total ............... 610 ms → 1160 ms
 * ============================================================================
 */
const ANIM_DONUT_MS = 1400;
const ANIM_LEGENDA_MS = 550;
/** Atraso de entrada de cada legenda, na ordem Concluídos → Pendentes → Total. */
const ANIM_LEGENDA_ATRASOS_MS = [250, 430, 610];
/** Deslocamento horizontal inicial de cada linha (à ESQUERDA do lugar final). */
const ANIM_LEGENDA_DESLOCAMENTO_PX = -12;
/** Curva única da cascata (sem bounce, sem salto) — `[0.22, 1, 0.36, 1]`. */
const ANIM_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/**
 * A entrada externa do card (`entradaCard` → `cardVariants`, do `MetricCard`)
 * leva 0,4 s de fade + subida, precedida de 0,08 s por índice. A revelação
 * espera apenas o que FALTA desse tempo: se o card já entrou muito antes de
 * ficar visível (o caso comum do scroll), começa na hora. Não há como ouvir a
 * conclusão da entrada do `MotionCard`: `onAnimationComplete` é encaminhada ao
 * DOM por `motion.create(Card)` e o React a ignora.
 */
const ANIM_ENTRADA_MS = 400;
const ANIM_ENTRADA_POR_INDICE_MS = 80;

/**
 * Entrada das legendas do donut.
 *
 * `aguardando` = revelação ainda não começou (linha montada, invisível — evita
 * "piscar" quando o gatilho chega);
 * `animar`     = entra em cascata acompanhando o desenho do donut;
 * `final`      = movimento reduzido: aparece direto no estado final, sem motion.
 */
export type EstadoAnimacaoLegenda = 'aguardando' | 'animar' | 'final';

/**
 * Linha de legenda do donut (ponto + rótulo + valor + percentual). A linha
 * inteira entra como UMA unidade (marcador + nome + quantidade + percentual),
 * com `opacity 0→1` e `x: −12px → 0` — ou seja, da ESQUERDA para a direita —
 * na curva `ANIM_EASE`, no atraso da sua posição em `ANIM_LEGENDA_ATRASOS_MS`.
 */
function LinhaLegenda({
  cor,
  rotulo,
  valor,
  percentual,
  indice = 0,
  estado = 'final',
}: {
  cor: string;
  rotulo: string;
  valor: number;
  percentual?: number;
  /** Posição na cascata (0 = Concluídos, 1 = Pendentes, 2 = Total). */
  indice?: number;
  /** Estado da entrada sincronizada com o donut. */
  estado?: EstadoAnimacaoLegenda;
}) {
  const conteudo = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', cor)} />
        <span className="truncate text-muted-foreground">{rotulo}</span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span className="w-6 text-right font-medium tabular-nums">{valor}</span>
        {percentual !== undefined && (
          <span className="w-9 text-right text-muted-foreground tabular-nums">{percentual}%</span>
        )}
      </span>
    </>
  );

  const classe = 'flex items-center justify-between gap-3 text-xs';

  // Movimento reduzido: sem `motion` — a linha já nasce no estado final.
  if (estado === 'final') return <div className={classe}>{conteudo}</div>;

  return (
    <motion.div
      className={classe}
      initial={{ opacity: 0, x: ANIM_LEGENDA_DESLOCAMENTO_PX }}
      animate={estado === 'animar' ? { opacity: 1, x: 0 } : { opacity: 0, x: ANIM_LEGENDA_DESLOCAMENTO_PX }}
      transition={{
        duration: ANIM_LEGENDA_MS / 1000,
        delay: (ANIM_LEGENDA_ATRASOS_MS[indice] ?? 0) / 1000,
        ease: ANIM_EASE,
      }}
    >
      {conteudo}
    </motion.div>
  );
}

/** Card A — donut do status real dos feedbacks. */
function CardFeedbacksPorStatus({
  feedbacks,
  onNavigate,
  indice = 0,
}: {
  feedbacks: any[];
  onNavigate?: (tab: string) => void;
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice?: number;
}) {
  const total = feedbacks.length;
  const concluidos = feedbacks.filter((f) => normalizarStatus(f?.status) === 'concluido').length;
  const pendentes = total - concluidos;
  const pctConcluido = total ? limitarPercentual((concluidos / total) * 100) : 0;

  // Identidade ESTÁVEL do dataset: com o array recriado a cada render, o
  // Recharts trataria todo re-render como "dados atualizados" e reanimaria o
  // donut (movimento duplicado em hover/re-render). Com `useMemo` ele só muda
  // quando os números mudam de fato.
  const dados = useMemo(
    () => [
      { nome: 'Concluídos', valor: concluidos, cor: 'hsl(var(--success))' },
      { nome: 'Pendentes', valor: pendentes, cor: 'hsl(var(--warning))' },
    ],
    [concluidos, pendentes]
  );

  // ── GATILHO ÚNICO DA REVELAÇÃO ─────────────────────────────────────────
  // A sequência (donut → percentual → legendas) só parte quando AS TRÊS
  // condições são verdadeiras, e todas travam depois de acontecer:
  //   1. movimento permitido — `useMovimentoReduzido()`, a fonte única do app.
  //      Em PRODUÇÃO ele respeita `prefers-reduced-motion` do usuário; no DEV
  //      ele libera o movimento completo pelo override centralizado
  //      `dp-force-motion` (é o que permite inspecionar a animação numa máquina
  //      com "reduzir movimento" ligado). Ler `useReducedMotion()` direto do
  //      Framer — como este card fazia — ignorava esse override e deixava o
  //      card permanentemente no estado final.
  //   2. o CONTEÚDO está observável (`useInView`, `once: true`): o donut não é
  //      desenhado antes de o usuário ver, nem é redesenhado no hover.
  //   3. a entrada EXTERNA do card terminou — a revelação espera só o que falta
  //      do tempo da entrada (ver `ANIM_ENTRADA_MS`), para não acontecer atrás
  //      do fade do card. Em cena depois da entrada, o espera é zero.
  // O `Pie` só é montado quando a revelação começa — é isso que garante que o
  // Recharts execute o desenho progressivo AQUI, e não uma vez fora da tela.
  const [montadoEm] = useState(() => performance.now());
  const [revelacaoDisparada, setRevelacaoDisparada] = useState(false);
  const conteudoRef = useRef<HTMLDivElement>(null);
  // Sem `once`: a visibilidade é reavaliada até o disparo acontecer. Com `once`,
  // um instante de visibilidade durante o carregamento (o layout da página ainda
  // cresce e o card pode ficar momentaneamente em cena) já "travava" o gatilho e
  // o desenho acontecia fora da tela. Se o card sair de cena antes do disparo, o
  // timer é cancelado e a revelação só acontece quando ele voltar a aparecer.
  const emVista = useInView(conteudoRef, { amount: 0.35 });
  const reduzirMovimento = useMovimentoReduzido();
  const [desenhoIniciado, setDesenhoIniciado] = useState(false);
  const [revelacaoConcluida, setRevelacaoConcluida] = useState(false);

  const aoIniciarDesenho = useCallback(() => setDesenhoIniciado(true), []);
  const aoTerminarDesenho = useCallback(() => setRevelacaoConcluida(true), []);

  const entradaMs = ANIM_ENTRADA_MS + Math.min(indice, MAX_ENTRADA_INDEX) * ANIM_ENTRADA_POR_INDICE_MS;

  const revelando = !reduzirMovimento && revelacaoDisparada;

  useEffect(() => {
    if (!emVista || reduzirMovimento || revelacaoDisparada) return;
    const restante = Math.max(0, entradaMs - (performance.now() - montadoEm));
    const t = window.setTimeout(() => setRevelacaoDisparada(true), restante);
    return () => window.clearTimeout(t);
  }, [emVista, reduzirMovimento, revelacaoDisparada, entradaMs, montadoEm]);

  // Fim da revelação: desliga o `isAnimationActive` do Recharts para que uma
  // atualização de dados só re-renderize os setores (sem desenhar de novo). O
  // `onAnimationEnd` do Recharts é o sinal exato; o timer é a rede de segurança
  // (contado a partir do INÍCIO REAL do desenho, então nunca corta a animação).
  useEffect(() => {
    if (!desenhoIniciado) return;
    const t = window.setTimeout(() => setRevelacaoConcluida(true), ANIM_DONUT_MS + 400);
    return () => window.clearTimeout(t);
  }, [desenhoIniciado]);

  // Estado ÚNICO que coordena donut + percentual + legendas:
  //   'final'      → movimento reduzido: tudo já no estado final, sem animação;
  //   'aguardando' → gatilho ainda não partiu: nada desenhado, percentual 0% e
  //                  legendas ocultas (é o "frame inicial" da revelação);
  //   'animar'     → desenho em curso: donut desenha, percentual conta, legendas entram.
  // `revelando` LATCHA: uma vez disparada, a sequência continua mesmo que o card
  // saia de cena no meio (não reinicia nem cancela no meio do desenho).
  const estadoAnimacao: EstadoAnimacaoLegenda = reduzirMovimento ? 'final' : desenhoIniciado ? 'animar' : 'aguardando';

  return (
    <MotionCard {...entradaCard(indice)} className="flex h-full flex-col border-border/30">
      <CabecalhoCard
        icone={<BarChart3 className="h-4.5 w-4.5" />}
        corIcone="text-primary"
        titulo="Feedbacks por Status"
        acao="Ver feedbacks"
        onAcao={() => onNavigate?.('feedbacks')}
      />
      {/*
        Conteúdo centralizado verticalmente (`items-center`) — o bloco
        donut + legenda é o único da fileira que não cresce, então é o card que
        mais dependia da compactação do card C. `pt-1.5 pb-1.5` equilibra o
        respiro acima/abaixo do bloco; a legenda logo ao lado do donut
        (`gap-3`, era `gap-4`) encosta o texto no gráfico como na referência.
      */}
      <CardContent ref={conteudoRef} className="flex flex-1 items-center px-4 pb-1.5 pt-1.5">
        {total === 0 ? (
          <p className="w-full py-6 text-center text-xs text-muted-foreground">Nenhum feedback registrado.</p>
        ) : (
          <div className="flex w-full items-center gap-3">
            <div className="relative h-[140px] w-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: DONUT_PX, height: DONUT_PX }}>
                <PieChart>
                  {/* Donut: mesmas cores e o mesmo `paddingAngle` de antes,
                      numa caixa de 140 px (a medida da referência aprovada) para
                      o gráfico preencher a altura útil do card em vez de flutuar
                      no meio de espaço vazio — `innerRadius` 52 / `outerRadius`
                      70 mantêm a ESPESSURA do anel em 18 px, dentro da faixa
                      17–19 px pedida. O que não muda é QUANDO ele existe: o
                      `Pie` só é montado no instante do gatilho, então o Recharts
                      executa a revelação ali mesmo (e não uma vez fora da tela,
                      já concluída). Concluída a revelação, `isAnimationActive`
                      volta a `false` — uma atualização de dados re-renderiza os
                      setores no estado final, sem redesenhá-los. */}
                  {(reduzirMovimento || revelando) && (
                    <Pie
                      data={dados}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius={52}
                      outerRadius={70}
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={revelando && !revelacaoConcluida}
                      animationBegin={0}
                      animationDuration={ANIM_DONUT_MS}
                      animationEasing="ease-out"
                      onAnimationStart={aoIniciarDesenho}
                      onAnimationEnd={aoTerminarDesenho}
                    >
                      {dados.map((d) => (
                        <Cell key={d.nome} fill={d.cor} />
                      ))}
                    </Pie>
                  )}
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                {/* Percentual central sincronizado com o desenho: 0% antes do
                    gatilho, contagem 0 → valor REAL durante os mesmos 1.400 ms
                    do donut (mesma formatação, só inteiros) e o valor exato
                    quando a revelação termina — sem reiniciar em atualização de
                    dados. */}
                {estadoAnimacao === 'final' || revelacaoConcluida ? (
                  <span className={CLASSE_VALOR_DONUT}>{pctConcluido}%</span>
                ) : desenhoIniciado ? (
                  <PercentualCentral
                    valor={pctConcluido}
                    ativo={!revelacaoConcluida}
                    reduzirMovimento={reduzirMovimento}
                  />
                ) : (
                  <span className={CLASSE_VALOR_DONUT}>0%</span>
                )}
                <motion.span
                  className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: estadoAnimacao === 'aguardando' ? 0 : 1 }}
                  transition={
                    reduzirMovimento
                      ? { duration: 0 }
                      : {
                          duration: ANIM_LEGENDA_MS / 1000,
                          delay: ANIM_LEGENDA_ATRASOS_MS[0] / 1000,
                          ease: ANIM_EASE,
                        }
                  }
                >
                  concluídos
                </motion.span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <LinhaLegenda
                cor="bg-success"
                rotulo="Concluídos"
                valor={concluidos}
                percentual={pctConcluido}
                indice={0}
                estado={estadoAnimacao}
              />
              <LinhaLegenda
                cor="bg-warning"
                rotulo="Pendentes"
                valor={pendentes}
                percentual={total ? limitarPercentual((pendentes / total) * 100) : 0}
                indice={1}
                estado={estadoAnimacao}
              />
              <div className="border-t border-border/20 pt-1.5">
                <LinhaLegenda
                  cor="bg-muted-foreground/50"
                  rotulo="Total"
                  valor={total}
                  percentual={100}
                  indice={2}
                  estado={estadoAnimacao}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </MotionCard>
  );
}

/**
 * Faixas semânticas da distribuição de notas (do topo para a base).
 *
 * O `barra` de cada faixa é o degradê horizontal aprovado em "Amplitude de
 * Liderança" (`bg-gradient-to-r from-success to-primary` /
 * `from-warning/60 to-warning`) — mesma técnica de cor inicial profunda →
 * cor final luminosa, preservando a cor semântica já existente (verde nas notas
 * altas, amarelo/lime nas intermediárias, âmbar e vermelho nas baixas). O
 * `tinta` (cor do ícone/rótulo) NÃO muda, e o preenchimento usa a MESMA
 * animação daquele card (`BarraProgresso`).
 */
const FAIXAS_NOTA = [
  { nota: 5, rotulo: '5 estrelas', barra: 'bg-gradient-to-r from-success to-primary', tinta: 'text-success' },
  { nota: 4, rotulo: '4 estrelas', barra: 'bg-gradient-to-r from-success to-primary', tinta: 'text-success' },
  { nota: 3, rotulo: '3 estrelas', barra: 'bg-gradient-to-r from-primary to-warning', tinta: 'text-primary' },
  { nota: 2, rotulo: '2 estrelas', barra: 'bg-gradient-to-r from-warning/60 to-warning', tinta: 'text-warning' },
  {
    nota: 1,
    rotulo: '1 estrela',
    barra: 'bg-gradient-to-r from-destructive/60 to-destructive-vivid',
    tinta: 'text-destructive-vivid',
  },
];

/** Card B — distribuição das notas dos feedbacks em barras horizontais. */
function CardDistribuicaoNotas({
  feedbacks,
  onNavigate,
  indice = 1,
}: {
  feedbacks: any[];
  onNavigate?: (tab: string) => void;
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice?: number;
}) {
  const total = feedbacks.length;
  const reduzirMovimento = useMovimentoReduzido();
  const contagem = FAIXAS_NOTA.map((faixa) => ({
    ...faixa,
    quantidade: feedbacks.filter((f) => Math.round(Number(f?.nota_geral ?? 0)) === faixa.nota).length,
  }));

  return (
    <MotionCard {...entradaCard(indice)} className="flex h-full flex-col border-border/30">
      <CabecalhoCard
        icone={<Star className="h-4.5 w-4.5 fill-current" />}
        corIcone="text-warning"
        titulo="Distribuição das Notas"
        acao="Ver feedbacks"
        onAcao={() => onNavigate?.('feedbacks')}
      />
      {/*
        As cinco faixas formam UM BLOCO contínuo de 5 × 26 px com 3 px entre
        linhas (≈ 142 px), centrado verticalmente — não mais distribuídas pela
        altura inteira do card. Era `justify-between`: o card de 225 px esticava
        as cinco linhas até as bordas, deixando ~30 px de vão entre uma e outra
        (o oposto do bloco agrupado da referência). `pt-1.5 pb-2` mantém o
        respiro enxuto acima/abaixo.
      */}
      <CardContent className="flex flex-1 flex-col justify-center gap-[3px] px-4 pb-2 pt-1.5">
        {total === 0 ? (
          <p className="w-full py-6 text-center text-xs text-muted-foreground">Nenhuma nota registrada.</p>
        ) : (
          contagem.map((faixa, indiceFaixa) => {
            const pct = limitarPercentual((faixa.quantidade / total) * 100);
            return (
              <div key={faixa.nota} className="flex h-[26px] items-center gap-2.5">
                <span className={cn('flex w-[88px] shrink-0 items-center gap-1.5 text-[11px]', faixa.tinta)}>
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="text-foreground/80">{faixa.rotulo}</span>
                </span>
                <BarraProgresso
                  percentual={pct}
                  indice={indiceFaixa}
                  cor={faixa.barra}
                  reduzirMovimento={reduzirMovimento}
                  trilhoClassName="h-1.5 flex-1 bg-secondary"
                />
                <span className="w-7 text-right text-[11px] font-medium tabular-nums">{faixa.quantidade}</span>
                <span className="w-9 text-right text-[11px] text-muted-foreground tabular-nums">{pct}%</span>
              </div>
            );
          })
        )}
      </CardContent>
    </MotionCard>
  );
}

/**
 * Grade COMPARTILHADA pelo cabeçalho e pelas linhas do card "Metas do Ciclo
 * (Top 5)" — garante que as três colunas do cabeçalho fiquem exatamente sobre as
 * colunas dos dados.
 *
 * As proporções são resolvidas pela LARGURA DO PRÓPRIO CARD (container query
 * `@min-[20rem]`, o `CardContent` é `@container`), não pela viewport: o card
 * aparece em 3 colunas (≥ 1280), em 2 (768–1279) ou em 1 (< 768) conforme o grid
 * da página, então a largura real varia de ~224 px a ~440 px.
 *
 * · Card largo (≥ 20 rem) → três colunas:
 *     Meta        `minmax(0,1.15fr)` — maior fatia horizontal, até 2 linhas;
 *     Responsável `minmax(0,1fr)`   — avatar de 16 px + nome completo (com menos
 *                                     que isto, "William Nunes Cardoso" quebra
 *                                     em 3 linhas);
 *     Progresso   `minmax(96px,auto)` — piso fixo (barra + "100%"), nunca
 *                                     espremido nem invadindo a coluna anterior.
 *
 * A queda de `1.3fr/104px` para `1.05fr/96px` (e o avatar de 20 → 16 px) devolve
 * ~30 px para as duas colunas de texto: é o que mantém nomes e títulos em UMA
 * linha nos 416 px de card da resolução de referência, em vez dos três níveis de
 * quebra que empurravam a altura do card.
 * · Card estreito (< 20 rem, ex.: 224 px em 768 px de viewport) → UMA coluna por
 *   registro (nome da meta, depois avatar+nome, depois barra+percentual). Sem
 *   isso a célula do responsável colapsava para 1 px e o nome quebrava letra por
 *   letra (card de 1500 px de altura).
 *
 * O `minmax(0,…)` nos `fr` é o que permite ao texto QUEBRAR linha em vez de
 * vazar da célula (sem `min-width:auto` implícito).
 */
/**
 * Cabeçalho de colunas + lista de metas com o MESMO respiro enxuto do resto da
 * área: `pt-2 pb-2.5` no conteúdo, `space-y-1` (4 px) entre as metas — cada linha
 * com `min-h-[27px]` (linha de 1 ou 2 linhas de texto em 11 px) e `pb-0.5` no
 * cabeçalho de colunas. Este é o card MAIS ALTO da fileira: é ele quem define a
 * altura de A e B, então cada pixel economizado aqui aparece também nos outros
 * dois. Com `space-y-1.5` (a versão anterior) e nomes quebrando em 2 linhas, o
 * bloco das cinco metas passava de 175 px — a 151 px de agora (dentro da faixa
 * de 140–155 px da referência) ele é quem fixa a fileira em 228 px.
 */
const COLUNAS_METAS_TOP5 =
  'grid grid-cols-1 gap-1.5 @min-[20rem]:grid-cols-[minmax(0,1.05fr)_minmax(0,1.1fr)_minmax(96px,auto)] @min-[20rem]:items-center @min-[20rem]:gap-2.5';

/** Card C — cinco metas de maior progresso no ciclo. */
function CardMetasTop5({
  metas,
  onNavigate,
  indice = 2,
}: {
  metas: any[];
  onNavigate?: (tab: string) => void;
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice?: number;
}) {
  const reduzirMovimento = useMovimentoReduzido();
  const top = metas
    .slice()
    .sort((a, b) => progressoMeta(b) - progressoMeta(a))
    .slice(0, 5);

  return (
    <MotionCard {...entradaCard(indice)} className="flex h-full flex-col border-border/30">
      <CabecalhoCard
        icone={<Target className="h-4.5 w-4.5" />}
        corIcone="text-primary"
        titulo="Metas do Ciclo (Top 5)"
        acao="Ver todas"
        onAcao={() => onNavigate?.('metas')}
      />
      <CardContent className="@container flex flex-1 flex-col px-4 pb-2.5 pt-2">
        {top.length === 0 ? (
          <p className="w-full py-6 text-center text-xs text-muted-foreground">Nenhuma meta vinculada a este ciclo.</p>
        ) : (
          <>
            {/* Cabeçalho só faz sentido quando as três colunas cabem no card. */}
            <div
              className={cn(
                COLUNAS_METAS_TOP5,
                'hidden pb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground @min-[20rem]:grid'
              )}
            >
              <span>Meta</span>
              <span>Responsável</span>
              <span>Progresso</span>
            </div>
            <div className="space-y-1">
              {top.map((meta, indiceMeta) => {
                const pct = progressoMeta(meta);
                const responsavel = meta?.colaborador?.nome_completo ?? meta?.responsavel ?? '—';
                return (
                  <div key={meta.id} className={cn(COLUNAS_METAS_TOP5, 'min-h-[27px]')}>
                    {/* Meta: nome COMPLETO — `break-words` em vez de `truncate`:
                        uma linha quando couber, duas quando o título for longo e a
                        altura da linha cresce naturalmente. `leading-[1.15]` é o
                        que mantém a linha de duas linhas em 26 px. */}
                    <span className="break-words text-[11px] font-medium leading-[1.15]">{meta.titulo}</span>
                    {/* Responsável: avatar circular preservado (16 px) + nome
                        completo ao lado, centralizados verticalmente na célula. */}
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-medium text-primary">
                        {iniciais(responsavel)}
                      </span>
                      <span className="min-w-0 break-words text-[11px] leading-[1.15] text-muted-foreground">
                        {responsavel}
                      </span>
                    </span>
                    {/* Progresso: SEM largura fixa própria — a coluna reserva o piso
                        de 96px no `minmax()` e o `w-full` cresce a partir dele, de
                        modo que barra e percentual ficam alinhados entre os registros
                        e o percentual nunca é cortado. */}
                    <span className="flex w-full items-center gap-1.5">
                      <BarraProgresso
                        percentual={pct}
                        indice={indiceMeta}
                        cor={gradienteProgresso(pct)}
                        reduzirMovimento={reduzirMovimento}
                        trilhoClassName="h-1.5 flex-1 bg-secondary"
                      />
                      <span
                        className={cn(
                          'w-8 shrink-0 text-right text-[11px] font-medium tabular-nums',
                          tintaProgresso(pct)
                        )}
                      >
                        {pct}%
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </MotionCard>
  );
}

interface AnaliticosDesempenhoProps {
  feedbacks: any[];
  metas: any[];
  onNavigate?: (tab: string) => void;
  /** Índice inicial da cascata (2 na aba Ciclos: depois de Ciclo Ativo e Alertas). */
  indiceBase?: number;
}

export function AnaliticosDesempenho({ feedbacks, metas, onNavigate, indiceBase = 0 }: AnaliticosDesempenhoProps) {
  return (
    <EntradaPresenca>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <CardFeedbacksPorStatus feedbacks={feedbacks} onNavigate={onNavigate} indice={indiceBase} />
        <CardDistribuicaoNotas feedbacks={feedbacks} onNavigate={onNavigate} indice={indiceBase + 1} />
        <CardMetasTop5 metas={metas} onNavigate={onNavigate} indice={indiceBase + 2} />
      </div>
    </EntradaPresenca>
  );
}
