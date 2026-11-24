import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, History } from 'lucide-react';
import { toast } from 'sonner';
import { motion, type Variants } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
// FONTE ÚNICA do modo de movimento do app (ver `src/lib/motionMode.ts`): NUNCA
// ler `useReducedMotion()` do Framer direto aqui — ver o bloco "CASCATA
// SEQUENCIAL" mais abaixo.
import { useMovimentoReduzido } from '@/lib/motionMode';
import { exportPontoCSV } from '@/services/exportService';
import { AuditoriaChips } from './AuditoriaChips';
import { AuditoriaDetalheDialog } from './AuditoriaDetalheDialog';
import { AuditoriaEvento, type ResponsavelResolvido } from './AuditoriaEvento';
import { AuditoriaFiltros } from './AuditoriaFiltros';
import {
  FILTROS_VAZIOS,
  agruparPorDia,
  aplicarFiltros,
  contarPorModulo,
  filtrosAtivos,
  linhasParaExport,
  normalizarEvento,
  opcoesDeAcao,
  opcoesDeResponsavel,
  type EventoDerivado,
  type FiltrosAuditoria,
  type GrupoAuditoria,
} from './auditoriaComum';
// MOCK VISUAL — ver src/mocks/desempenhoMock.ts.
import { getMockDesempenhoAudit } from '@/mocks/desempenhoMock';

/**
 * ============================================================================
 * AUDITORIA (Gestão de Desempenho) — TRILHA EM TIMELINE.
 *
 * Estrutura: barra de filtros → chips de módulo com contadores → timeline
 * agrupada por dia, com uma GRADE FIXA por evento.
 *
 * ── GRADE DA LINHA (ver `AuditoriaEvento`) ─────────────────────────────────
 * Cada evento é uma linha de grid com as MESMAS colunas em toda a lista:
 * trilho · horário · ícone · bloco principal · nota · módulo · ação ·
 * responsável · "Ver detalhes" · menu. O alinhamento vertical é o centro e a
 * trilha vertical vive DENTRO de cada linha (coluna 1), então ela se emenda de
 * um evento para o outro e o ponto fica sempre centrado no item.
 *
 * ── O QUE MUDOU ESTRUTURALMENTE ────────────────────────────────────────────
 * O painel único com registros empilhados, selo `AÇÃO - TABELA` e JSON bruto na
 * linha foi SUBSTITUÍDO por: descrição legível por evento, agrupamento por dia
 * (Hoje/Ontem/data), contadores por módulo, filtros funcionais e "Ver detalhes".
 * O JSON técnico continua acessível — agora apenas no diálogo de detalhes.
 *
 * ── DADOS ──────────────────────────────────────────────────────────────────
 * A consulta NÃO mudou: mesmas 5 tabelas, mesma ordenação, mesmo limite. Os
 * filtros, contadores, grupos e títulos são derivados client-side em
 * `auditoriaComum.ts`. Nenhum dado é inventado: campo ausente não é exibido.
 * ============================================================================
 */

interface PerformanceAuditTimelineProps {
  /**
   * Colaboradores já carregados pela página — usados SOMENTE para resolver
   * nome/cargo/foto do e-mail do responsável. Sem correspondência, o evento
   * mostra as iniciais do próprio e-mail (nunca um nome fabricado).
   */
  colaboradores?: {
    id: string;
    nome_completo: string;
    cargo?: string | null;
    departamento?: string | null;
    foto_url?: string | null;
    email?: string | null;
  }[];
}

/**
 * ============================================================================
 * CASCATA SEQUENCIAL DA TRILHA — uma coreografia ÚNICA (nenhum atraso solto
 * espalhado pelos elementos).
 *
 * A regra é uma só, aplicada dia a dia na ordem da listagem:
 *   cabeçalho do dia → eventos desse dia em cascata → dia seguinte → ...
 *
 * COMO A ORDEM É GARANTIDA — e por que a tela NUNCA some: tudo é DECLARATIVO.
 * Cada elemento recebe `animate="visible"` (alvo constante) com o atraso já
 * calculado, então a Motion SEMPRE conduz o nó até o estado final; não existe
 * promessa para resolver, `await` para ficar pendente nem estilo inicial escrito
 * por fora que o React possa repor. A sequência dia → dia nasce do CRONOGRAMA:
 * o atraso de um dia começa onde o dia anterior termina (ver `montarCronograma`).
 * Além disso, uma REDE DE SEGURANÇA leva ao estado final qualquer item que ainda
 * esteja invisível ao fim do tempo teórico — ver `MARGEM_REDE_SEGURANCA`.
 *
 * Os três tempos vivem aqui (fonte única): 350ms de cabeçalho, 450ms por evento
 * e 180ms entre o início de um evento e o do seguinte. Só `opacity`/`transform`
 * são animados, então o layout definitivo não muda.
 * ============================================================================
 */
const DURACAO_CABECALHO = 0.35; // s — cabeçalho do dia
const DURACAO_EVENTO = 0.45; // s — cada linha de evento
const INTERVALO_EVENTO = 0.18; // s — intervalo entre o início de dois eventos
const EASE_CASCATA = 'easeOut' as const;

/**
 * Margem da REDE DE SEGURANÇA (ver o efeito no componente): folga aplicada
 * DEPOIS do prazo de cada item (atraso + duração, gravado em
 * `data-cascata-prazo`) antes de forçar o estado final. É o que garante que
 * nenhuma falha deixe a trilha apagada — sem nunca revelar um item antes de a
 * animação dele ter tido chance de acontecer.
 */
const MARGEM_REDE_SEGURANCA = 2; // s

/** Duração de UM dia: cabeçalho + eventos (já com o intervalo entre eles). */
function duracaoDoDia(quantidadeDeEventos: number): number {
  if (quantidadeDeEventos <= 0) return DURACAO_CABECALHO;
  return DURACAO_CABECALHO + (quantidadeDeEventos - 1) * INTERVALO_EVENTO + DURACAO_EVENTO;
}

/**
 * RECOLHIMENTO — a cascata INVERSA da entrada.
 *
 * A saída reusa a MESMA régua da entrada (450ms por evento, 180ms entre o início
 * de um e o do seguinte) e o MESMO easing (`EASE_CASCATA`): o que muda é o
 * SENTIDO e a ORDEM. Cada evento sobe 28px e some; o ÚLTIMO começa primeiro e o
 * PRIMEIRO é o último a sair — a cascata de entrada reproduzida ao contrário.
 *
 * `DURACAO_RECOLHER` é quanto a SUPERFÍCIE (a caixa que segura as linhas) leva
 * para encolher a altura DEPOIS que o primeiro evento terminou de sair. É isso
 * que impede os agrupamentos seguintes de "pular" para cima de uma vez.
 */
const DURACAO_RECOLHER = 0.25; // s — altura da superfície, após a cascata
const DURACAO_MINIMA_SAIDA = 0.35; // s — recolhimento imediato (movimento reduzido)

/** Tempo total da cascata inversa de `quantidade` eventos (último → primeiro). */
function duracaoSaidaEventos(quantidade: number): number {
  if (quantidade <= 0) return 0;
  return (quantidade - 1) * INTERVALO_EVENTO + DURACAO_EVENTO;
}

/**
 * Atrasos (s) do EVENTO no `custom` das variantes: um para a entrada (vindo do
 * cronograma) e outro para a saída (cascata inversa).
 */
interface AtrasosEvento {
  atraso: number;
  atrasoSaida: number;
}

/**
 * Fase de cada dia na máquina de estados EXPLÍCITA do recolhimento. O conteúdo
 * nunca é desmontado no clique — ele só sai do DOM depois da animação.
 */
type FaseDia = 'aberto' | 'recolhendo' | 'recolhido';

/** Entrada do dia: fade + "de dentro para fora" (escala 0,96 → 1). */
const VARIANTE_CABECALHO = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: (atraso: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: atraso, duration: DURACAO_CABECALHO, ease: EASE_CASCATA },
  }),
};

/**
 * Evento: ENTRADA (desce 28px até a posição) e SAÍDA (sobe os mesmos 28px e
 * some). A saída é a reprodução INVERSA da entrada — mesmo `y`, mesma duração e
 * mesmo easing. O `custom` traz os DOIS atrasos: `atraso` (entrada, do
 * cronograma) e `atrasoSaida` (saída, do fim para o começo da lista).
 */
const VARIANTE_EVENTO = {
  hidden: { opacity: 0, y: -28 },
  visible: ({ atraso }: AtrasosEvento) => ({
    opacity: 1,
    y: 0,
    transition: { delay: atraso, duration: DURACAO_EVENTO, ease: EASE_CASCATA },
  }),
  exit: ({ atrasoSaida }: AtrasosEvento) => ({
    opacity: 0,
    y: -28,
    transition: { delay: atrasoSaida, duration: DURACAO_EVENTO, ease: EASE_CASCATA },
  }),
};

/**
 * Movimento reduzido: SEM deslocamento e SEM espera — os itens entram juntos,
 * num fade curto (150ms). O `atraso` que chega é sempre 0 neste caminho (ver
 * `atrasoInicial` no JSX), então cabeçalho e eventos ficam visíveis de imediato,
 * como a acessibilidade pede. Quem decide entrar aqui é `useMovimentoReduzido()`
 * — a fonte única do app —, NUNCA o `useReducedMotion()` do Framer.
 *
 * A SAÍDA segue a mesma régua: um fade curto, sem deslocamento nenhum.
 */
const VARIANTE_CABECALHO_SUAVE = {
  hidden: { opacity: 0 },
  visible: (atraso: number) => ({ opacity: 1, transition: { delay: atraso, duration: 0.15, ease: EASE_CASCATA } }),
};
const VARIANTE_EVENTO_SUAVE = {
  hidden: { opacity: 0 },
  visible: ({ atraso }: AtrasosEvento) => ({
    opacity: 1,
    transition: { delay: atraso, duration: 0.15, ease: EASE_CASCATA },
  }),
  exit: ({ atrasoSaida }: AtrasosEvento) => ({
    opacity: 0,
    transition: { delay: atrasoSaida, duration: 0.15, ease: EASE_CASCATA },
  }),
};

/**
 * SUPERFÍCIE DOS EVENTOS — o contêiner que segura as linhas de um dia.
 *
 * Repouso (`aberto`): altura automática e sem animação própria — quem entra em
 * cascata são os eventos. No recolhimento (`recolher`): a altura encolhe até
 * zero e a superfície some, MAS só DEPOIS que o primeiro evento terminou de sair
 * (`delay` = duração da cascata inversa). Sem isso, os agrupamentos seguintes
 * pulariam para cima no meio da animação.
 */
const VARIANTE_EVENTOS = {
  aberto: { height: 'auto', opacity: 1, transition: { duration: 0.2, ease: EASE_CASCATA } },
  recolher: (quantidade: number) => ({
    height: 0,
    opacity: 0,
    transition: {
      height: { delay: duracaoSaidaEventos(quantidade), duration: DURACAO_RECOLHER, ease: EASE_CASCATA },
      opacity: { delay: duracaoSaidaEventos(quantidade), duration: DURACAO_RECOLHER, ease: EASE_CASCATA },
    },
  }),
};

/** Movimento reduzido: a superfície encolhe num fade curto, sem espera. */
const VARIANTE_EVENTOS_SUAVE = {
  aberto: { height: 'auto', opacity: 1, transition: { duration: 0.15 } },
  recolher: { height: 0, opacity: 0, transition: { duration: 0.15 } },
};

/**
 * Atraso inválido nunca chega à Motion: sem isto, um `undefined`/`NaN` viraria
 * `delay` inválido e o elemento poderia ficar preso no estado inicial.
 */
function atraso(valor: number | undefined): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0;
}

/** Cronograma de um dia — atrasos em segundos, medidos a partir da montagem. */
interface CronogramaDia {
  cabecalho: number;
  eventos: number[];
}

/**
 * Cronograma CUMULATIVO: cada dia começa onde o anterior termina. É puro (só
 * depende das quantidades), então pode ser recalculado a cada render sem
 * efeitos colaterais — quem garante a estabilidade do que já está em cena é a
 * captura do atraso na montagem (ver `ItemCascata`).
 */
function montarCronograma(grupos: GrupoAuditoria[]): Map<string, CronogramaDia> {
  const cronograma = new Map<string, CronogramaDia>();
  let cursor = 0;
  for (const grupo of grupos) {
    cronograma.set(grupo.chave, {
      cabecalho: cursor,
      eventos: grupo.eventos.map((_, k) => cursor + DURACAO_CABECALHO + k * INTERVALO_EVENTO),
    });
    cursor += duracaoDoDia(grupo.eventos.length);
  }
  return cronograma;
}

/**
 * NÓ ANIMADO DA CASCATA — cabeçalho do dia e linha de evento.
 *
 * Três estados explícitos, gravados NO PRÓPRIO NÓ (`data-cascata-fase`):
 *   • `pendente`  — aguardando a vez (a Motion já cuida do atraso);
 *   • `animando`  — a Motion começou a transição deste item;
 *   • `completo`  — a transição terminou.
 *
 * O atraso e o PRAZO (`data-cascata-prazo`, timestamp absoluto) são capturados
 * UMA vez, na montagem: recalcular o cronograma (filtro, reabertura, re-render)
 * não reposiciona nem reinicia um item que já está em cena; só quem REMONTA pega
 * um cronograma novo. O prazo é o que permite à rede de segurança agir item a
 * item — e NUNCA antes da hora dele.
 *
 * Como `animate="visible"` é um alvo constante, a Motion SEMPRE conduz o nó ao
 * estado final: a visibilidade do registro não depende de promessa, `await` ou
 * estado externo.
 */
type PropsItemCascata = {
  /** Atraso (segundos) da primeira apresentação — capturado na montagem. */
  atrasoInicial: number;
  /** Atraso (segundos) da SAÍDA em cascata inversa — só o evento usa. */
  atrasoSaida?: number;
  /** `true` enquanto o dia recolhe: leva o evento ao estado `exit`. */
  recolhendo?: boolean;
  /** Variantes da cascata (movimento normal ou suave). */
  variantes: Variants;
} & ({ como: 'cabecalho'; indice: number; fechado: boolean; onAlternar: () => void } | { como: 'evento'; indice: number });

function ItemCascata(props: PropsItemCascata & { children: ReactNode }) {
  const { atrasoInicial, variantes, como, indice, children } = props;
  const duracao = como === 'cabecalho' ? DURACAO_CABECALHO : DURACAO_EVENTO;
  const [atraso] = useState(atrasoInicial);
  const [prazo] = useState(() => performance.now() + (atrasoInicial + duracao) * 1000);
  const refBotao = useRef<HTMLButtonElement | null>(null);
  const refLinha = useRef<HTMLDivElement | null>(null);

  /** Fase gravada direto no nó (sem `setState`: não provoca re-render). */
  const marcarFase = (fase: 'animando' | 'completo') => {
    const el = como === 'cabecalho' ? refBotao.current : refLinha.current;
    if (el) el.dataset.cascataFase = fase;
  };

  /**
   * Alvo da animação. O cabeçalho vai sempre a `visible`; o evento só vai a
   * `exit` enquanto o dia está RECOLHENDO — e, ao fim do recolhimento, o dia
   * sai do DOM, então nada permanece preso nesse estado.
   */
  const alvo = como === 'evento' && props.recolhendo ? 'exit' : 'visible';

  /** `custom` das variantes: número (cabeçalho) ou par de atrasos (evento). */
  const custom = como === 'evento' ? { atraso, atrasoSaida: props.atrasoSaida ?? 0 } : atraso;

  const comuns = {
    'data-cascata-item': true,
    'data-cascata-fase': 'pendente',
    'data-cascata-prazo': Math.round(prazo),
    // Marca os eventos que estão saindo DE PROPÓSITO: a rede de segurança os
    // ignora (senão forçaria `opacity: 1` de volta no meio da cascata inversa).
    'data-cascata-saida': como === 'evento' && props.recolhendo ? 'sim' : undefined,
    variants: variantes,
    custom,
    initial: 'hidden',
    animate: alvo,
    onAnimationStart: () => marcarFase('animando'),
    onAnimationComplete: () => marcarFase('completo'),
  } as const;

  if (como === 'cabecalho') {
    return (
      <motion.button
        ref={refBotao}
        type="button"
        aria-expanded={!props.fechado}
        onClick={props.onAlternar}
        data-cascata-cabecalho={indice}
        {...comuns}
        className="group flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-gradient-to-r from-muted/75 via-muted/45 to-muted/25 px-3.5 py-2.5 text-left transition-colors hover:from-muted/85 hover:via-muted/55 hover:to-muted/35"
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.div ref={refLinha} data-cascata-evento={indice} {...comuns}>
      {children}
    </motion.div>
  );
}

export function PerformanceAuditTimeline({ colaboradores = [] }: PerformanceAuditTimelineProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['performance-audit-logs'],
    queryFn: async () => {
      // MOCK VISUAL — ver src/mocks/desempenhoMock.ts. Sem isto a trilha ficaria
      // vazia no modo demonstração (a `audit_log` real não tem registros do módulo).
      const ficticios = getMockDesempenhoAudit();
      if (ficticios) return ficticios;

      const { data, error } = await (supabase as any)
        .from('audit_log')
        .select('*')
        .or(
          'tabela.eq.ciclos_avaliacao,tabela.eq.metas_okrs,tabela.eq.feedbacks_360,tabela.eq.pdis,tabela.eq.competencias_matriz'
        )
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  const [filtros, setFiltros] = useState<FiltrosAuditoria>(FILTROS_VAZIOS);
  /**
   * FASE DE CADA DIA — máquina de estados EXPLÍCITA do recolhimento:
   *   `aberto`     → eventos em cena (cascata de entrada normal);
   *   `recolhendo` → a cascata INVERSA está rodando (último evento → primeiro);
   *   `recolhido`  → eventos fora de cena, superfície já recolhida.
   *
   * O conteúdo NUNCA é desmontado no clique: ele só sai do DOM quando a
   * animação termina (é o fim de `recolhendo`) — por isso a fase intermediária.
   * Um clique durante o recolhimento CANCELA a saída e volta para `aberto`.
   */
  const [fases, setFases] = useState<Record<string, FaseDia>>({});
  /** Timers que fecham cada recolhimento (um por dia), sempre canceláveis. */
  const timersRecolher = useRef(new Map<string, number>());
  const [detalhe, setDetalhe] = useState<EventoDerivado | null>(null);
  /**
   * `aberto` é SEPARADO do dado de propósito: fechar o modal só desliga este
   * booleano, mantendo o evento em memória até o fim da animação de saída
   * (cascata) — é o `AnimatePresence` do modal que decide quando o conteúdo sai
   * do DOM. Trocar para `null` no clique mataria a animação de fechamento.
   */
  const [detalheAberto, setDetalheAberto] = useState(false);
  const abrirDetalhe = (evento: EventoDerivado) => {
    setDetalhe(evento);
    setDetalheAberto(true);
  };
  const [exportando, setExportando] = useState(false);

  const eventos = useMemo(() => (logs as unknown[]).map(normalizarEvento), [logs]);
  const filtrados = useMemo(() => aplicarFiltros(eventos, filtros), [eventos, filtros]);
  const contagens = useMemo(() => contarPorModulo(eventos, filtros), [eventos, filtros]);
  const grupos = useMemo(() => agruparPorDia(filtrados), [filtrados]);
  const acoes = useMemo(() => opcoesDeAcao(eventos), [eventos]);
  const responsaveis = useMemo(() => opcoesDeResponsavel(eventos), [eventos]);

  /** Índice e-mail → colaborador real (nome/cargo/foto). */
  const porEmail = useMemo(() => {
    const mapa = new Map<string, ResponsavelResolvido>();
    colaboradores.forEach((c) => {
      const email = String(c.email ?? '')
        .trim()
        .toLowerCase();
      if (!email) return;
      mapa.set(email, {
        nome: String(c.nome_completo ?? '').trim() || email,
        secundario:
          [c.cargo, c.departamento]
            .map((v) => String(v ?? '').trim())
            .filter(Boolean)
            .join(' · ') || null,
        foto: String(c.foto_url ?? '').trim() || null,
      });
    });
    return mapa;
  }, [colaboradores]);

  /* ── CASCATA SEQUENCIAL (declarativa) ───────────────────────────────────────
     Ver o bloco de constantes acima. Aqui só se calcula o CRONOGRAMA (puro) e se
     monta a REDE DE SEGURANÇA. Quem anima é a Motion, conduzindo cada nó até
     `visible` — a visibilidade dos registros NÃO depende de promessa nenhuma.

     ── MOVIMENTO REDUZIDO: POR QUE VEM DE `useMovimentoReduzido()` ────────────
     A decisão NÃO é lida do `useReducedMotion()` do Framer. Esse hook lê a
     preferência do SO direto e IGNORA o modo centralizado do app — é o sintoma
     já documentado em `AnaliticosDesempenho.tsx`. Ler o hook nativo aqui fazia
     a cascata COLAPSAR numa única aparição: com `prefers-reduced-motion: reduce`
     ligado na máquina, `VARIANTE_*_SUAVE` entrava com atraso 0 e 150ms de fade,
     então cabeçalho e todos os eventos apareciam JUNTOS, já na posição final —
     exatamente "a timeline surge pronta, sem animação".

     `useMovimentoReduzido()` é a fonte única: honra o override de inspeção do
     dev (`dp-force-motion`, ver `motionMode.ts`, que libera o movimento COMPLETO
     para se poder ver a coreografia) e, em PRODUÇÃO, respeita a preferência de
     acessibilidade do usuário (`MOTION_REDUCED_MODE === 'user'`). É o que
     permite ter as DUAS coisas ao mesmo tempo: cascata visível no navegador de
     inspeção E exibição imediata/sem deslocamento para quem pediu movimento
     reduzido. Nada aqui depende de CSS global nem de `<MotionConfig>`. */
  const movimentoReduzido = useMovimentoReduzido();
  const containerRef = useRef<HTMLDivElement>(null);
  const cronograma = useMemo(() => montarCronograma(grupos), [grupos]);

  // Dias já apresentados: os eventos deles, quando REMONTAM (dia reaberto),
  // cascateiam sozinhos e imediatamente — sem esperar o resto da trilha.
  // A lista é PODADA quando um dia sai pelo filtro: se ele voltar, entra como
  // dia novo (cabeçalho e eventos juntos, na ordem da cascata) em vez de ter só
  // os eventos adiantados. O `setState` no efeito é intencional e roda DEPOIS de
  // os itens montarem (ou seja, depois de cada um capturar o atraso da primeira
  // apresentação): ele não reposiciona nada que já está em cena.
  const [diasApresentados, setDiasApresentados] = useState<string[]>([]);
  useEffect(() => {
    const chaves = grupos.map((grupo) => grupo.chave);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDiasApresentados((anteriores) => {
      const atuais = anteriores.filter((chave) => chaves.includes(chave));
      const saiuAlgum = atuais.length !== anteriores.length;
      const entrouAlgum = chaves.some((chave) => !atuais.includes(chave));
      return !saiuAlgum && !entrouAlgum ? anteriores : chaves;
    });
  }, [grupos]);

  /**
   * RECOLHIMENTO — dois efeitos que mantêm a máquina de estados honesta:
   *   1. ao desmontar, nenhum timer pendente continua vivo (o dia não pode
   *      "renascer" recolhido depois que a trilha saiu de cena);
   *   2. as fases de dias que saíram pelo FILTRO são podadas — se o dia voltar,
   *      ele volta ABERTO (mesma regra de `diasApresentados`), sem estado órfão.
   */
  useEffect(() => {
    const timers = timersRecolher.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const chaves = new Set(grupos.map((grupo) => grupo.chave));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFases((atuais) => {
      const entradas = Object.entries(atuais).filter(([chave]) => chaves.has(chave));
      return entradas.length === Object.keys(atuais).length ? atuais : Object.fromEntries(entradas);
    });
  }, [grupos]);

  /**
   * REDE DE SEGURANÇA — garante que a trilha NUNCA fique vazia, sem nunca
   * atropelar a animação.
   *
   * A animação é só uma melhoria progressiva: os registros são renderizados pelo
   * React de qualquer forma. A varredura é POR ITEM e só age DEPOIS do
   * `data-cascata-prazo` daquele item (atraso + duração, capturados na montagem):
   *   • item `completo`     → ignorado (nada é tocado);
   *   • item antes do prazo → ignorado (a animação dele ainda vai acontecer);
   *   • item vencido e ainda invisível (falhou/cancelou foi interrompida) →
   *     levado ao estado final (`opacity: 1`, sem `transform`).
   *
   * DUAS CONDIÇÕES antes de forçar o estado final — e é isso que impede a
   * recuperação de rodar durante uma animação SAUDÁVEL:
   *   1. vencido o próprio prazo (+ `MARGEM_REDE_SEGURANCA`);
   *   2. a opacidade computada NÃO mudou desde a varredura anterior (o item está
   *      PARADO, não em movimento). Um item que ainda está subindo de 0 → 1 tem
   *      leitura diferente a cada 250ms e ganha mais uma chance; um que está
   *      travado em 0 (animação que falhou/cancelou) é revelado já na 2ª leitura.
   *
   * Como o prazo é do próprio item, é impossível revelar algo antes da hora — o
   * sintoma "aparece tudo pronto, sem animação" não tem como voltar — e também é
   * impossível algo ficar escondido. Sem `!important`, sem regra global.
   */
  useEffect(() => {
    const raiz = containerRef.current;
    if (!raiz) return;
    const varrer = () => {
      const agora = performance.now();
      raiz.querySelectorAll<HTMLElement>('[data-cascata-item]').forEach((el) => {
        if (el.dataset.cascataFase === 'completo') return;
        // Evento em CASCATA INVERSA: a saída é intencional — a rede de segurança
        // nunca deve "ressuscitar" (opacity 1) um item que está recolhendo.
        if (el.dataset.cascataSaida === 'sim') return;
        const prazo = Number(el.dataset.cascataPrazo);
        if (!Number.isFinite(prazo) || agora < prazo + MARGEM_REDE_SEGURANCA * 1000) return;
        // Leitura crua (a string) guardada no próprio nó: comparar a string
        // evita tratar `NaN` como "visível" e detecta o item PARADO.
        const leitura = getComputedStyle(el).opacity;
        const leituraAnterior = el.dataset.cascataLeitura;
        el.dataset.cascataLeitura = leitura;
        const opacidade = Number.parseFloat(leitura);
        if (Number.isFinite(opacidade) && opacidade >= 1) return;
        // Ainda em movimento (a opacidade mudou desde a última varredura): a
        // animação está saudável, apenas mais lenta — não tocar.
        if (leituraAnterior !== undefined && leituraAnterior !== leitura) return;
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    };
    const id = window.setInterval(varrer, 250);
    return () => window.clearInterval(id);
  }, [grupos, fases, movimentoReduzido]);

  const alterarFiltros = (parcial: Partial<FiltrosAuditoria>) => setFiltros((f) => ({ ...f, ...parcial }));

  const exportar = () => {
    if (filtrados.length === 0) {
      toast.info('Nenhum evento para exportar com os filtros atuais.');
      return;
    }
    setExportando(true);
    try {
      exportPontoCSV(linhasParaExport(filtrados), 'auditoria-desempenho.csv');
      toast.success(`Trilha exportada (${filtrados.length} ${filtrados.length === 1 ? 'evento' : 'eventos'}).`);
    } catch {
      toast.error('Não foi possível exportar a trilha agora.');
    } finally {
      setExportando(false);
    }
  };

  /**
   * Alterna o dia. Três caminhos, todos explícitos:
   *   • `aberto`     → começa o RECOLHIMENTO: o conteúdo permanece montado
   *     (fase `recolhendo`) e um timer só o tira de cena DEPOIS da cascata
   *     inversa + o encolhimento da superfície;
   *   • `recolhendo` → CANCELA a saída (clique rápido/repetido): o timer é
   *     limpo e o dia volta a `aberto`, reentrando com a cascata de entrada;
   *   • `recolhido`  → reabre normalmente (o conteúdo REMONTA e cascateia).
   */
  const alternarGrupo = (chave: string) => {
    const fase = fases[chave] ?? 'aberto';

    // Qualquer clique limpa um eventual timer pendente deste dia.
    const pendente = timersRecolher.current.get(chave);
    if (pendente !== undefined) {
      window.clearTimeout(pendente);
      timersRecolher.current.delete(chave);
    }

    if (fase === 'aberto') {
      const quantidade = grupos.find((grupo) => grupo.chave === chave)?.eventos.length ?? 0;
      const esperaMs = movimentoReduzido
        ? DURACAO_MINIMA_SAIDA * 1000
        : Math.round((duracaoSaidaEventos(quantidade) + DURACAO_RECOLHER) * 1000) + 60;
      const id = window.setTimeout(() => {
        timersRecolher.current.delete(chave);
        setFases((atuais) => (atuais[chave] === 'recolhendo' ? { ...atuais, [chave]: 'recolhido' } : atuais));
      }, esperaMs);
      timersRecolher.current.set(chave, id);
      setFases((atuais) => ({ ...atuais, [chave]: 'recolhendo' }));
      return;
    }

    setFases((atuais) => ({ ...atuais, [chave]: 'aberto' }));
  };

  return (
    <div className="space-y-3">
      <AuditoriaFiltros
        indice={0}
        filtros={filtros}
        onFiltros={alterarFiltros}
        acoes={acoes}
        responsaveis={responsaveis}
        ativos={filtrosAtivos(filtros)}
        onLimpar={() => setFiltros(FILTROS_VAZIOS)}
        onExportar={exportar}
        exportando={exportando}
      />

      <AuditoriaChips
        indice={1}
        modulo={filtros.modulo}
        onModulo={(modulo) => alterarFiltros({ modulo })}
        contagens={contagens}
      />

      {/* SEM card externo: a trilha vive DIRETO no fundo da página (nada de
          background, borda, raio ou sombra envolvendo tudo). O destaque fica por
          conta dos cabeçalhos de dia e das superfícies de evento. Este `<div>` é
          a RAIZ que a cascata imperativa varre (`escopo`) — ele mesmo não anima:
          quem entra, em sequência, é cada dia e cada evento (tempos no topo). */}
      <div ref={containerRef}>
        {isLoading ? (
          <p className="py-12 text-center text-xs italic text-muted-foreground">Carregando trilha...</p>
        ) : grupos.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-12 text-center text-xs italic text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            {eventos.length === 0
              ? 'Nenhum registro de auditoria disponível.'
              : 'Nenhum evento corresponde aos filtros aplicados.'}
          </p>
        ) : (
          // Cada DIA é um bloco: faixa de cabeçalho DESTACADA + superfície de
          // eventos mais ESCURA. O `space-y` separa um dia do outro sem que o
          // último evento de um dia pareça pertencer ao dia seguinte.
          <div className="space-y-4">
            {grupos.map((grupo, indiceGrupo) => {
              const fase = fases[grupo.chave] ?? 'aberto';
              const recolhido = fase === 'recolhido';
              const recolhendo = fase === 'recolhendo';
              // A seta já indica "recolhido" durante a saída (o dia está fechando).
              const fechado = fase !== 'aberto';
              const cronogramaDoDia = cronograma.get(grupo.chave);
              const diaJaApresentado = diasApresentados.includes(grupo.chave);
              return (
                <section key={grupo.chave}>
                  {/* CABEÇALHO DO DIA — faixa divisória de seção: superfície um
                      degrau mais CLARA que os eventos (gradiente horizontal sutil),
                      borda fina e cantos arredondados. O destaque vem do contraste
                      entre as superfícies, não de cor saturada. Hover só muda a
                      luminosidade, de leve. */}
                  <ItemCascata
                    como="cabecalho"
                    indice={indiceGrupo}
                    fechado={fechado}
                    onAlternar={() => alternarGrupo(grupo.chave)}
                    variantes={movimentoReduzido ? VARIANTE_CABECALHO_SUAVE : VARIANTE_CABECALHO}
                    atrasoInicial={movimentoReduzido ? 0 : atraso(cronogramaDoDia?.cabecalho)}
                  >
                    <span className="text-[13px] font-semibold tracking-tight text-foreground">{grupo.rotulo}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{grupo.detalhe}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                      {/* CONTADOR — chip em verde-lima do Design System: fundo
                          translúcido, borda fina, texto de contraste e o glow
                          lime oficial (`shadow-glow`), sempre visível. No hover do
                          cabeçalho (`.group`) o fundo e a borda sobem um degrau,
                          com transição de 200ms. Geometria (px-2 py-0.5 · text-[11px]
                          · rounded-md) e posição à direita: inalteradas. */}
                      <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary shadow-glow transition-colors duration-200 group-hover:border-primary/50 group-hover:bg-primary/15">
                        {grupo.total} {grupo.total === 1 ? 'evento' : 'eventos'}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${fechado ? '-rotate-90' : ''}`}
                      />
                    </span>
                  </ItemCascata>

                  {/* SUPERFÍCIE DOS EVENTOS — um degrau mais ESCURA que o cabeçalho
                      (mesma régua de `bg-background/40` já usada nas superfícies de
                      registro do app). As linhas usam a MESMA grade; sem espaço
                      entre elas, a trilha vertical de cada uma se emenda na próxima.
                      Cada `motion.div` interno NÃO anima nada por conta própria: é o
                      contêiner de UMA linha, para a cascata mover o item inteiro
                      (trilho, horário, conteúdo, tag, autor e CTA) como UM bloco —
                      nenhuma microparte voa separada.

                      ESTE é o contêiner da cascata: no recolhimento (`recolhendo`)
                      ele encolhe a altura e some SÓ DEPOIS que o primeiro evento
                      terminou de sair (delay em `VARIANTE_EVENTOS`), evitando que os
                      dias seguintes pulem para cima no meio da animação. A fase
                      `recolhido` (fim do timer) é quem tira tudo do DOM. */}
                  {!recolhido && (
                    <motion.div
                      initial="aberto"
                      animate={recolhendo ? 'recolher' : 'aberto'}
                      variants={movimentoReduzido ? VARIANTE_EVENTOS_SUAVE : VARIANTE_EVENTOS}
                      custom={grupo.eventos.length}
                      className="mt-1.5 overflow-hidden rounded-lg bg-background/50"
                    >
                      {grupo.eventos.map((derivado, indiceEvento) => (
                        <ItemCascata
                          key={derivado.evento.id}
                          como="evento"
                          indice={indiceGrupo}
                          recolhendo={recolhendo}
                          variantes={movimentoReduzido ? VARIANTE_EVENTO_SUAVE : VARIANTE_EVENTO}
                          atrasoSaida={
                            movimentoReduzido
                              ? 0
                              : (grupo.eventos.length - 1 - indiceEvento) * INTERVALO_EVENTO
                          }
                          atrasoInicial={
                            movimentoReduzido
                              ? 0
                              : diaJaApresentado
                                ? indiceEvento * INTERVALO_EVENTO
                                : atraso(cronogramaDoDia?.eventos[indiceEvento])
                          }
                        >
                          <AuditoriaEvento
                            derivado={derivado}
                            responsavel={
                              derivado.evento.usuarioEmail
                                ? porEmail.get(derivado.evento.usuarioEmail.trim().toLowerCase())
                                : undefined
                            }
                            onDetalhes={() => abrirDetalhe(derivado)}
                          />
                        </ItemCascata>
                      ))}
                    </motion.div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <AuditoriaDetalheDialog
        derivado={detalhe}
        aberto={detalheAberto}
        onOpenChange={setDetalheAberto}
      />
    </div>
  );
}
