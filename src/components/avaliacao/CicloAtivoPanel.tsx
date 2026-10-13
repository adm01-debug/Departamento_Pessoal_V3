import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Radio } from 'lucide-react';
import { motion, type MotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { formatarPeriodo, gradienteProgresso, type ContadoresItens } from './desempenhoComum';
import { EntradaPresenca, MotionCard, entradaCard } from './entradaCards';
import { BarraProgresso } from './barraProgresso';

/**
 * ============================================================================
 * PAINEL "CICLO ATIVO" — Gestão de Desempenho.
 *
 * Composição em três regiões (≈30% / ≈38% / ≈32% no desktop):
 *   • esquerda → identificação do ciclo (badge, nome, descrição, tipo/período);
 *   • centro   → timeline com as cinco etapas do processo de avaliação;
 *   • direita  → progresso geral e contadores do que existe de fato.
 *
 * ⚠️ HONESTIDADE DOS DADOS: o sistema NÃO possui as etapas operacionais da
 * referência (Planejamento / Avaliações / Feedbacks / Calibração /
 * Encerramento) — `ciclos_avaliacao` não tem tabela/campo de fase e o único
 * dado de situação é o `status` geral (rascunho → ativo/em_andamento →
 * concluído; CHECK em `20260713110053`), que NÃO é equivalente às cinco fases.
 * A timeline exibe a ESTRUTURA de cinco marcos da referência e, enquanto o
 * `MOCK_VISUAL_TRILHA` abaixo estiver ligado, os ESTADOS são de um mock local
 * (ver nota do mock). O "Progresso geral" é a média das metas vinculadas ao
 * ciclo (mesma fórmula de `progressoMeta`) e os contadores são derivados de
 * `metas_okrs` (status + data_limite) — números REAIS, nada copiado da
 * referência.
 * ============================================================================
 */

/**
 * Etapas do processo de avaliação exibidas na referência visual.
 *
 * ⚠️ LIMITAÇÃO DE DADOS: o sistema NÃO registra o estado individual destas
 * etapas (não há tabela/campo de fase em `ciclos_avaliacao`). Enquanto o mock
 * visual abaixo estiver ligado, os estados são de vitrine; com ele desligado,
 * os cinco marcos voltam a ser NEUTROS — a estrutura do processo aparece, mas
 * sem afirmar progresso.
 */
const ETAPAS_CICLO = ['Planejamento', 'Avaliações', 'Feedbacks', 'Calibração', 'Encerramento'] as const;

/**
 * ── MOCK VISUAL DA TRILHA (TEMPORÁRIO, LOCAL, SÓ PARA DESIGN) ────────────────
 *
 * A trilha precisa ser validada visualmente no layout de referência:
 * Planejamento e Avaliações concluídas, Feedbacks como etapa atual, Calibração
 * e Encerramento pendentes. Como o backend não expõe fase por etapa (ver nota
 * acima), os estados são um MOCK explicativo — NÃO vêm de dado algum e não
 * alteram nenhuma regra de negócio: são só os três estados que o componente já
 * sabe desenhar (`concluida` / `atual` / `futura`).
 *
 * Para voltar ao comportamento anterior (todos os marcos neutros), basta
 * desligar `MOCK_VISUAL_TRILHA`. Quando existir um campo real de fase, troque
 * `estadoDaEtapa` por esse dado e remova este bloco.
 */
const MOCK_VISUAL_TRILHA = true;
/** Índice da etapa atual do mock (2 = "Feedbacks", como na referência). */
const MOCK_VISUAL_ETAPA_ATUAL = 2;

/**
 * ── REVELAÇÃO PROGRESSIVA DAS ETAPAS ─────────────────────────────────────────
 *
 * MESMA animação do "Histórico Profissional"
 * (`src/components/colaborador-detalhes/TrabalhoHierarquiaTab.tsx`), que é a
 * referência aprovada: a conexão é DESENHADA por `scaleX` 0→1 (`easeInOut`) e
 * cada marcador surge "de dentro para fora" (`opacity` + `scale` com o ease de
 * overshoot `[0.34, 1.56, 0.64, 1]`), seguido do rótulo (`opacity` + `y`,
 * `[0.25, 0.46, 0.45, 0.94]`, atraso do marcador + 0.2s).
 *
 * `ETAPAS_REVEAL_GAP` é o MESMO valor de `HISTORICO_REVEAL_GAP` da referência:
 * é o intervalo entre um marco e o seguinte ser alcançado pela linha — a
 * duração total do traço é `GAP * (nº de etapas - 1) + 0.4`, exatamente a
 * fórmula de lá. Lá a leitura é da DIREITA para a esquerda; aqui é da ESQUERDA
 * para a direita (a ordem real das cinco etapas), então o atraso CRESCE com o
 * índice — o espelho do histórico profissional, como também já é feito no
 * "Andamento do processo" do desligamento.
 *
 * Os atrasos e as durações são IDÊNTICOS aos da referência; só a origem do
 * `scaleX` (`left`) e a ordem dos atrasos são espelhadas.
 */
const ETAPAS_REVEAL_GAP = 0.45;

/**
 * Props de revelação de cada peça. Com movimento reduzido devolvem `{}`: sem
 * `initial`, a Motion renderiza direto o estado final (nada de espera, nada de
 * "aparecer depois") — a timeline fica exatamente no estado de repouso.
 */
function propsTraco(reduzir: boolean, delay: number, duracao: number): MotionProps {
  if (reduzir) return {};
  return {
    initial: { scaleX: 0 },
    animate: { scaleX: 1 },
    transition: { delay, duration: duracao, ease: 'easeInOut' },
  };
}

function propsMarcador(reduzir: boolean, delay: number): MotionProps {
  if (reduzir) return {};
  return {
    initial: { opacity: 0, scale: 0 },
    animate: { opacity: 1, scale: 1 },
    transition: { delay, duration: 0.55, ease: [0.34, 1.56, 0.64, 1] },
  };
}

function propsRotulo(reduzir: boolean, delay: number): MotionProps {
  if (reduzir) return {};
  return {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  };
}

/** Situação de uma etapa. `futura` = neutra (nenhum progresso afirmado). */
type EstadoEtapa = 'concluida' | 'atual' | 'futura';

interface EtapaCiclo {
  rotulo: string;
  estado: EstadoEtapa;
}

/**
 * Estado de vitrine de uma etapa (ver `MOCK_VISUAL_TRILHA`): antes da atual →
 * concluída; na atual → `atual`; depois → pendente. Com o mock desligado,
 * devolve `futura` para todas, como antes.
 */
function estadoDaEtapa(indice: number): EstadoEtapa {
  if (!MOCK_VISUAL_TRILHA) return 'futura';
  if (indice < MOCK_VISUAL_ETAPA_ATUAL) return 'concluida';
  if (indice === MOCK_VISUAL_ETAPA_ATUAL) return 'atual';
  return 'futura';
}

/** Deriva as cinco etapas com seus estados (hoje vindos do mock visual). */
function construirEtapas(): EtapaCiclo[] {
  return ETAPAS_CICLO.map((rotulo, indice) => ({ rotulo, estado: estadoDaEtapa(indice) }));
}

/**
 * Marcador de uma etapa. Proporções da referência: concluídas/futuras ~22px e a
 * ATUAL 24px (leve destaque). Com o mock visual ligado os três estados
 * aparecem: concluída = círculo success com check; atual = círculo lime com
 * halo; pendente = aro neutro.
 */
function MarcadorEtapa({ estado }: { estado: EstadoEtapa }) {
  if (estado === 'concluida') {
    return (
      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-success text-success-foreground">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (estado === 'atual') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.45)] ring-4 ring-primary/20">
        <span className="h-2 w-2 rounded-full bg-background" />
      </span>
    );
  }
  return (
    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-muted-foreground/40 bg-card">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
    </span>
  );
}

function Contador({
  valor,
  rotulo,
  cor,
}: {
  valor: number;
  rotulo: string;
  cor: 'success' | 'warning' | 'destructive';
}) {
  const corPonto = { success: 'bg-success', warning: 'bg-warning', destructive: 'bg-destructive-vivid' }[cor];
  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', corPonto)} />
      <div className="leading-tight">
        <p className="text-base font-display font-medium">{valor}</p>
        <p className="text-[10px] text-muted-foreground">{rotulo}</p>
      </div>
    </div>
  );
}

interface CicloAtivoPanelProps {
  ciclo: any;
  progresso: number | null;
  contadores: ContadoresItens;
  onNavigate?: (tab: string) => void;
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice?: number;
}

export function CicloAtivoPanel({ ciclo, progresso, contadores, onNavigate, indice = 0 }: CicloAtivoPanelProps) {
  const etapas = construirEtapas();
  // Índice da etapa atual: com o mock visual ligado é "Feedbacks" (2) e a
  // trilha passa a mostrar o traço colorido até ela e o selo "Atual"; com o
  // mock desligado fica -1 e a trilha volta a ser neutra (nenhum trecho
  // colorido, nenhum selo) — ver `MOCK_VISUAL_TRILHA`.
  const indiceAtual = etapas.findIndex((e) => e.estado === 'atual');
  // Fonte única de movimento do app (respeita a preferência do SO em produção e
  // o override de dev `dp-force-motion`). Com movimento reduzido a timeline
  // simplesmente já está no estado final.
  const reduzirMovimento = useMovimentoReduzido();
  /** Duração do traço: a MESMA fórmula do Histórico Profissional. */
  const duracaoTraco = ETAPAS_REVEAL_GAP * (etapas.length - 1) + 0.4;

  return (
    <MotionCard {...entradaCard(indice)} variant="elevated" className="border-border/30 bg-card/80">
      {/* Painel horizontal compacto: ≈30% / ≈38% / ≈32%, as três regiões
          centradas na vertical, padding de 20–24px e separação de 20px. */}
      <div className="grid gap-5 p-5 lg:grid-cols-[30fr_38fr_32fr] lg:items-center lg:px-6">
        {/* ─── A · INFORMAÇÕES DO CICLO (≈30%) ─────────────────────────── */}
        {/* Hierarquia da referência: badge → nome → descrição → complemento
            (tipo e período). Nada de dado novo: são os MESMOS campos. */}
        <div className="min-w-0 space-y-1.5">
          {/* Badge sólido verde-success com texto escuro, como na referência.
              `text-primary-foreground` é o mesmo near-black nos dois temas. */}
          <span className="inline-flex items-center gap-1.5 rounded-md bg-success px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
            <Radio className="h-3 w-3" />
            Ciclo Ativo
          </span>
          <h2 className="truncate text-2xl font-display font-medium tracking-tight" title={ciclo?.nome}>
            {ciclo?.nome}
          </h2>
          {ciclo?.descricao && (
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground" title={ciclo.descricao}>
              {ciclo.descricao}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            {ciclo?.tipo && <span className="capitalize">{ciclo.tipo}</span>}
            {ciclo?.tipo && <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />}
            <span className="font-mono">{formatarPeriodo(ciclo?.data_inicio, ciclo?.data_fim)}</span>
          </div>
        </div>

        {/* ─── B · ETAPAS DO PROCESSO (≈38%) ─────────────────────────────── */}
        {/* Estrutura de cinco marcos da referência. Os estados vêm do mock
            visual local (`MOCK_VISUAL_TRILHA`): duas concluídas, "Feedbacks"
            como atual, duas pendentes. O `title` deixa claro que é vitrine. */}
        {/* `EntradaPresenca` (ver `./entradaCards`): a rota vive dentro do
            `AnimatePresence initial={false}` do PageTransition, que PULA o
            keyframe inicial de qualquer `motion.*` descendente — sem este
            contexto novo a revelação simplesmente não tocaria. É o mesmo
            liberador usado pelos cards analíticos e pelos desligamentos. */}
        <EntradaPresenca>
          <div
            className="relative"
            title="Etapas do processo de avaliação. O sistema ainda não registra o estado individual de cada etapa — os estados exibidos aqui são um mock visual local de layout."
          >
            {/* Camada da LINHA (fica ATRÁS dos marcadores). `top-3` é o centro
                da caixa de 24px (`h-6`) que envolve cada marcador — assim o traço
                fica alinhado mesmo com marcadores de tamanhos diferentes. */}
            <div className="pointer-events-none absolute inset-x-0 top-3 h-[2px] -translate-y-1/2" aria-hidden>
              {/* Trilho contínuo, do centro do 1º ao centro do último marco:
                  DESENHADO da esquerda para a direita (`scaleX` 0→1 ancorado
                  na esquerda — mesmo mecanismo da referência, espelhado). */}
              <motion.div
                {...propsTraco(reduzirMovimento, 0, duracaoTraco)}
                style={{
                  transformOrigin: 'left',
                  left: `${(0.5 / etapas.length) * 100}%`,
                  right: `${(0.5 / etapas.length) * 100}%`,
                }}
                className="absolute h-full rounded-full bg-border"
              />
              {/* Trechos percorridos: existem a partir do momento em que a trilha
                  tem etapa atual (mock visual — ver `MOCK_VISUAL_TRILHA`). Verde
                  nas etapas vencidas, lime no segmento que entra na atual. O
                  centro do marco `i` cai em `(i + 0.5) / N` nas N colunas iguais.
                  Cada trecho é desenhado no instante em que o traço o alcança —
                  MESMO atraso do marcador correspondente. */}
              {indiceAtual >= 0 &&
                etapas.slice(0, indiceAtual).map((_, indice) => (
                  <motion.div
                    key={indice}
                    {...propsTraco(reduzirMovimento, ETAPAS_REVEAL_GAP * indice, ETAPAS_REVEAL_GAP)}
                    style={{
                      transformOrigin: 'left',
                      left: `${((indice + 0.5) / etapas.length) * 100}%`,
                      width: `${(1 / etapas.length) * 100}%`,
                    }}
                    className={cn(
                      'absolute h-full rounded-full transition-colors duration-500',
                      indice + 1 < indiceAtual ? 'bg-success' : 'bg-primary'
                    )}
                  />
                ))}
            </div>

            {/* Marcos em colunas IGUAIS (CSS Grid); rótulos centrados abaixo.
                Cada marcador entra "de dentro para fora" quando o traço o
                alcança, e o rótulo logo depois (+0.2s) — os MESMOS números da
                referência, com o atraso crescendo da esquerda para a direita. */}
            <div
              className="relative z-10 grid"
              style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}
            >
              {etapas.map((etapa, indice) => {
                const atraso = ETAPAS_REVEAL_GAP * indice;
                return (
                  <div key={etapa.rotulo} className="flex flex-col items-center gap-2 text-center">
                    <motion.span
                      {...propsMarcador(reduzirMovimento, atraso)}
                      className="flex h-6 items-center justify-center"
                    >
                      <MarcadorEtapa estado={etapa.estado} />
                    </motion.span>
                    <motion.span
                      {...propsRotulo(reduzirMovimento, atraso + 0.2)}
                      className={cn(
                        'text-[11px] leading-tight',
                        etapa.estado === 'atual' && 'font-medium text-primary',
                        etapa.estado === 'concluida' && 'text-foreground',
                        etapa.estado === 'futura' && 'text-muted-foreground'
                      )}
                    >
                      {etapa.rotulo}
                    </motion.span>
                    {etapa.estado === 'atual' && (
                      <motion.span
                        {...propsRotulo(reduzirMovimento, atraso + 0.2)}
                        className="text-[9px] font-semibold uppercase tracking-widest text-primary/80"
                      >
                        Atual
                      </motion.span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </EntradaPresenca>

        {/* ─── C · PROGRESSO GERAL (≈32%) ───────────────────────────────── */}
        <div className="space-y-2 lg:border-l lg:border-border/30 lg:pl-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium text-muted-foreground">Progresso geral</p>
            {/* Ação contextual REAL da área: salta para a aba "Metas & OKRs"
                (não existe rota/ação "Acompanhar ciclo" no sistema).

                Botão secundário PREMIUM, todo no verde-lima oficial
                (`--primary` — o MESMO token do marcador "Atual" da trilha e da
                barra de progresso), sem competir com o percentual ao lado:
                · repouso → texto e seta lime, fundo lime translúcido (10%),
                  borda fina lime e glow externo discreto;
                · hover   → fundo lime sólido, texto/seta no escuro do token
                  (`--primary-foreground`) e glow um pouco mais intenso;
                · seta desloca 2px à direita (`group-hover:translate-x-0.5`),
                  a MESMA microinteração já usada em Férias/Recrutamento — sem
                  animação pulsante/infinita;
                · transição de 200ms (o `transition-all` vem do próprio Button).

                Dimensões/posição e a ação (`onClick`) continuam intocadas:
                `h-7`, `px-2.5`, `rounded-lg`, `text-[11px] font-normal` e o
                `gap-1.5` são os de antes. */}
            <Button
              variant="outline"
              size="sm"
              className="group h-7 gap-1.5 rounded-lg border-primary/40 bg-primary/10 px-2.5 text-[11px] font-normal text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.08),0_0_10px_hsl(var(--primary)/0.18)] duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_0_3px_hsl(var(--primary)/0.14),0_0_16px_hsl(var(--primary)/0.35)]"
              onClick={() => onNavigate?.('metas')}
            >
              Ver metas
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>

          {/* Percentual dominante, com a origem do número na MESMA linha (não
              acrescenta altura ao painel). */}
          <div className="flex items-baseline gap-2">
            <p className="font-display text-4xl font-medium leading-none text-primary">
              {progresso === null ? '—' : `${progresso}%`}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {progresso === null ? 'sem metas vinculadas ao ciclo' : 'média das metas do ciclo'}
            </p>
          </div>

          {/* Trilho navy mais escuro (`bg-background`) + preenchimento na
              proporção do percentual REAL, com a MESMA animação/degradê das
              barras da área (`BarraProgresso` → padrão "Amplitude de
              Liderança"): cresce da esquerda para a direita em 0,6 s. */}
          <BarraProgresso
            percentual={progresso}
            cor={gradienteProgresso(progresso)}
            reduzirMovimento={reduzirMovimento}
            trilhoClassName="h-1.5 w-full bg-background"
          />

          {/* Três colunas iguais: número e legenda alinhados entre si. */}
          <div className="grid grid-cols-3 gap-2">
            <Contador valor={contadores.concluidas} rotulo="metas concluídas" cor="success" />
            <Contador valor={contadores.emAndamento} rotulo="em andamento" cor="warning" />
            <Contador valor={contadores.atrasadas} rotulo="atrasadas" cor="destructive" />
          </div>
        </div>
      </div>
    </MotionCard>
  );
}
