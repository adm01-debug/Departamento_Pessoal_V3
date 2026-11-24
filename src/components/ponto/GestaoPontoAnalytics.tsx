/**
 * ============================================================================
 * ANALYTICS DA GESTÃO DE PONTO — visão geral da aba "Gestão da Equipe".
 *
 * ORDEM VISUAL (de cima para baixo), a mesma da referência aprovada:
 *   1. Gráficos — rosca "Distribuição de Status" (35% rosca · 65% lista) e
 *      "Fluxo de Entradas por Horário" em BARRAS verticais (todas com o MESMO
 *      acabamento; o pico é comunicado só pelo selo do cabeçalho e pela dica).
 *   2. Cabeçalho "Painel de Gestão Estratégica" (abaixo dos gráficos).
 *   3. Três indicadores estratégicos compactos (ícone à esquerda, selo à
 *      direita, valor em destaque, linha de apoio).
 *   4. Monitor de Riscos Trabalhistas — container ESCURO, cabeçalho neutro com
 *      a balança em lime (`Scale`) + "Ver detalhes", e 3 cards com gradiente
 *      semântico, borda e glow no topo (relevo no estado normal, sem hover).
 *
 * REFINAMENTOS VISUAIS (só aparência — nenhum dado/cálculo novo):
 *   • rosca sem contorno branco (`stroke="none"`, o Recharts nasce com #fff);
 *   • rosca desenhada pelo `AnelDonut` (as MESMAS fatias, cores, raio e
 *     espessura do `<Pie>`), com o traçado progressivo da referência;
 *   • percentual central dominante e legenda em 3 colunas de largura fixa;
 *   • barras com preenchimento translúcido e contorno lime (ver MOVIMENTO).
 *
 * O QUE NÃO MUDOU: dados, cálculos, categorias, textos das regras, paleta
 * (`COLORS`), fontes e ícones. Nenhum indicador/percentual novo é inventado —
 * as únicas grandezas novas (percentual da rosca, hora de pico, topo do eixo e
 * participação da dica) são DERIVADAS dos dados exibidos.
 *
 * SÉRIE DO GRÁFICO DE BARRAS (vitrine × real): os números desenhados vêm de
 * `src/mocks/pontoFluxoMock.ts` enquanto `VITE_PONTO_MOCK=true` em DEV — um dia
 * de expediente completo, no lugar das uma ou duas batidas que os registros de
 * uma única pessoa produzem. Com a flag desligada o gráfico volta a desenhar
 * exclusivamente `hourDistribution` (registros reais da semana). As duas séries
 * NUNCA se somam, e nenhum número fictício alimenta a rosca, a previsão, a
 * conformidade ou o monitor de riscos.
 *
 * MOVIMENTO (régua do Design System, nada de número local):
 *   • rosca      → o MESMO traçado progressivo do card "Tipo de Vínculo": o
 *                  desenho é o `dashboard/anelDonut.tsx` (o anel que o
 *                  `DonutChart` usa), a mecânica mora em
 *                  `dashboard/arcoDonutMotion.ts` e os números no preset
 *                  `ANIMACAO_DONUT_CARD` (1,8 s por segmento, 0,2 s de atraso
 *                  inicial, 0,15 s entre segmentos, `easeOut`). O centro e as
 *                  quatro linhas da legenda entram com a cascata de
 *                  `VINCULO_LEGENDA` (mesma curva e mesmos atrasos da referência);
 *   • barras     → o MESMO crescimento do card "2. Visualize o impacto":
 *                  `ui/crescimentoBarras.ts` (900 ms por barra, 100 ms entre
 *                  elas, ease-in-out senoidal) e o mesmo acabamento translúcido
 *                  com contorno. A espessura do contorno é IDÊNTICA em todas as
 *                  colunas (inclusive a de pico) e NÃO existe número fixo sobre
 *                  a barra: o valor de cada hora é consultado pela dica (hover);
 *   • dica       → `PontoFluxoEntradasDica` (fade + 4 px de subida, 150 ms):
 *                  caixa ancorada na coluna ativa e presa dentro do plot — não
 *                  segue o mouse e não reinicia a animação das barras;
 *   • cards      → `entradaCard(i)` (14 px / 520 ms / 120 ms entre cards);
 *   • tudo roda UMA vez, na entrada em exibição, e respeita
 *     `prefers-reduced-motion` via `useMovimentoReduzido()`.
 * ============================================================================
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, MotionConfig, useInView } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cell, PieChart, Pie, ResponsiveContainer } from 'recharts';
import { ConteudoTooltipRosca, TooltipGrafico } from '@/components/ui/tooltipGrafico';
import { DicaFluxoEntradas } from '@/components/ponto/PontoFluxoEntradasDica';
// MOCK VISUAL — ver src/mocks/pontoFluxoMock.ts (só a série desenhada neste card).
import { HORARIOS_FLUXO_ENTRADAS, serieFluxoEntradasDemonstrativa } from '@/mocks/pontoFluxoMock';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Gavel,
  Scale,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// ANIMAÇÃO DE JANELA — a MESMA do popup "Pendências": `CascadeDialogFrame`
// (véu em fade + caixa em escala + blocos em cascata). Nenhuma coreografia
// nova: os números moram em `ui/cascade-motion.ts`.
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { cn } from '@/lib/utils';
import { entradaCard } from '@/components/ui/entrada-cards';
import { AnelDonut } from '@/components/dashboard/anelDonut';
import { VINCULO_LEGENDA, atrasoLegenda } from '@/components/dashboard/estruturaAnimacoes';
import { estiloCrescimentoBarra, useCrescimentoBarras } from '@/components/ui/crescimentoBarras';
import { MOTION_REDUCED_MODE, useMovimentoReduzido } from '@/lib/motionMode';

/**
 * Borda do selo de ocorrências do Monitor de Riscos, por variante. O `Badge`
 * nasce com `border-transparent` quando o tom é semântico (`success`,
 * `warning`, `destructive`); aqui o pill ganha contorno próprio para fechar a
 * composição sobre o gradiente do card — só a BORDA muda, o preenchimento
 * continua o do Design System.
 */
const BORDA_SELO: Record<'destructive' | 'warning' | 'success', string> = {
  destructive: 'border-destructive/40',
  warning: 'border-warning/40',
  success: 'border-success/35',
};

/**
 * ROSCA "DISTRIBUIÇÃO DE STATUS" — DUAS CAMADAS, CADA UMA COM UM PAPEL.
 *
 *   1. `<Pie>` do Recharts — INVISÍVEL (`fillOpacity={0}`), serve só de SENSOR:
 *      mantém a área de hover e o `TooltipGrafico` do gráfico exatamente como
 *      eram. Continua calculando ângulos, `paddingAngle` e raios (nada de
 *      cálculo de fatia refeito à mão aqui).
 *   2. `<AnelDonut>` — a PINTURA, com a MESMA implementação do card "Tipo de
 *      Vínculo" (`dashboard/anelDonut.tsx` + preset `ANIMACAO_DONUT_CARD`): o
 *      arco de cada segmento é desenhado progressivamente pelo
 *      `strokeDasharray`, um depois do outro.
 *
 * Por que o desenho não mora no `shape` do Recharts: o Recharts recria os
 * setores quando mede o layout, e um `motion` remontado no meio da entrada
 * perde a animação (o traçado aparecia pronto). Num `<svg>` do próprio React o
 * elemento é montado uma vez e o traçado roda inteiro, como na referência.
 *
 * GEOMETRIA DO ANEL, nas unidades do `viewBox` (0 0 100 100): os MESMOS 62% /
 * 90% do `<Pie>`, convertidos para raio médio do traçado (38) e espessura (14).
 * Assim cores, dimensões e proporções continuam idênticas.
 */
const ROSCA_CENTRO = 50;
const ROSCA_RAIO = 38;
const ROSCA_ESPESSURA = 14;

/**
 * VÃO entre fatias: 2 unidades de desenho = o `paddingAngle` de 3° do `<Pie>`
 * (≈ 3 px num anel de 150 px). O anel é desenhado com pontas RETAS
 * (`strokeLinecap="butt"`), então o vão aparente é exatamente esse — as pontas
 * arredondadas da referência alargariam o vão e/ou encurtariam a fatia.
 */
const ROSCA_VAO = 2;

export function GestaoPontoAnalytics({ registros }: { registros: any[] }) {
  /** Movimento reduzido pelo caminho ÚNICO do sistema (`lib/motionMode`). */
  const reduzirMovimento = useMovimentoReduzido();
  /** Estado do diálogo "Ver detalhes" do monitor de riscos. */
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  /**
   * Botão que abre o diálogo. Ele NÃO é um `Dialog.Trigger` (a moldura animada
   * `CascadeDialogFrame` cuida do Radix): por isso o foco volta para cá no
   * fechamento, via `onCloseAutoFocus` — o mesmo retorno de foco que o Radix
   * fazia com o trigger e que se perderia ao trocar `DialogContent` pela
   * moldura em cascata.
   */
  const refBotaoDetalhes = useRef<HTMLButtonElement | null>(null);

  /**
   * GATILHO das duas animações de entrada: o instante em que cada gráfico
   * aparece na viewport (`once: true`). É o mesmo contrato do `DonutChart` do
   * "Tipo de Vínculo" — a animação roda UMA vez e nunca reinicia em hover,
   * tooltip, refetch ou re-render.
   */
  const refRosca = useRef<HTMLDivElement | null>(null);
  const roscaEmVista = useInView(refRosca, { once: true });
  const refGraficoEntradas = useRef<HTMLDivElement | null>(null);
  const entradasEmVista = useInView(refGraficoEntradas, { once: true });

  // 1. Process attendance status distribution
  const statusDistribution = useMemo(() => {
    const counts = { 'No Horário': 0, Atrasos: 0, Faltas: 0, Incompletos: 0 };

    registros.forEach((r) => {
      if (!r.entrada_1 && !r.saida_1) counts['Faltas']++;
      else if (r.entrada_1 && !r.saida_1) counts['Incompletos']++;
      else if (r.atraso_minutos > 0) counts['Atrasos']++;
      else counts['No Horário']++;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [registros]);

  // 2. Predictive: Monthly Forecast
  const monthlyForecast = useMemo(() => {
    // Group by day to see trends
    const dailyHours: Record<string, number> = {};
    registros.forEach((r) => {
      if (r.horas_trabalhadas) {
        const [h, m] = String(r.horas_trabalhadas).split(':').map(Number);
        const mins = (h || 0) * 60 + (m || 0);
        dailyHours[r.data] = (dailyHours[r.data] || 0) + mins;
      }
    });

    const dates = Object.keys(dailyHours).sort();
    const values = dates.map((d) => dailyHours[d] / 60); // Hours

    // Very simple linear projection if we have enough data
    const last7DaysAverage =
      values.length > 0 ? values.slice(-7).reduce((a, b) => a + b, 0) / Math.min(values.length, 7) : 0;

    // Total accumulated vs Expected (8h/day per active collaborator)
    const totalAccumulated = values.reduce((a, b) => a + b, 0);
    const uniqueColabs = new Set(registros.map((r) => r.colaborador_id)).size;
    const daysPassed = values.length;
    const remainingDays = 30 - daysPassed; // Simplified month
    const projection = totalAccumulated + last7DaysAverage * Math.max(0, remainingDays);

    return {
      projection,
      last7DaysAverage,
      totalAccumulated,
      isOverBudget: projection > uniqueColabs * 160, // 160h/month baseline
    };
  }, [registros]);

  // 3. Hourly Distribution — janela fixa (06:00 → 20:00), uma coluna por hora.
  //    A faixa sai de `HORARIOS_FLUXO_ENTRADAS` para a série real e a
  //    demonstrativa nunca divergirem de janela.
  const hourDistribution = useMemo(() => {
    const horas: Record<string, number> = {};
    HORARIOS_FLUXO_ENTRADAS.forEach((hora) => {
      horas[hora] = 0;
    });

    registros.forEach((r) => {
      if (r.entrada_1) {
        const hour = `${String(r.entrada_1).split(':')[0]}:00`;
        if (horas[hour] !== undefined) horas[hour]++;
      }
    });

    return Object.entries(horas).map(([hour, count]) => ({ hour, count }));
  }, [registros]);

  /**
   * SÉRIE EXIBIDA no gráfico de barras — vitrine OU registros, nunca os dois
   * (MOCK VISUAL — ver `src/mocks/pontoFluxoMock.ts`). Fora do modo
   * demonstrativo `serieFluxoEntradasDemonstrativa()` devolve `null` e o gráfico
   * desenha exatamente `hourDistribution`.
   */
  const serieFluxo = useMemo(() => serieFluxoEntradasDemonstrativa() ?? hourDistribution, [hourDistribution]);

  /** Denominador da participação (%) da dica — derivado da série exibida. */
  const totalEntradasFluxo = serieFluxo.reduce((soma, item) => soma + item.count, 0);

  // 4. Compliance & Risks
  const complianceStats = useMemo(() => {
    let interjornadaViolations = 0;
    let excessiveWorkdays = 0; // > 10h total
    let shortIntervals = 0; // < 1h lunch

    const sorted = [...registros].sort((a, b) => {
      if (a.colaborador_id !== b.colaborador_id) return a.colaborador_id.localeCompare(b.colaborador_id);
      return new Date(a.data).getTime() - new Date(b.data).getTime();
    });

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      // Interjornada
      if (current.colaborador_id === next.colaborador_id && current.saida_1 && next.entrada_1) {
        const outTime = new Date(`${current.data}T${current.saida_1}`);
        const inTime = new Date(`${next.data}T${next.entrada_1}`);
        const diffHours = (inTime.getTime() - outTime.getTime()) / (1000 * 60 * 60);
        if (diffHours < 11 && diffHours > 0) interjornadaViolations++;
      }

      // Max workday
      if (current.horas_trabalhadas) {
        const match = String(current.horas_trabalhadas).match(/(\d+):/);
        if (match && parseInt(match[1]) >= 10) excessiveWorkdays++;
      }

      // Intervalo (simplified check)
      if (current.saida_intervalo && current.retorno_intervalo) {
        const [sh, sm] = current.saida_intervalo.split(':').map(Number);
        const [rh, rm] = current.retorno_intervalo.split(':').map(Number);
        const diff = rh * 60 + rm - (sh * 60 + sm);
        if (diff > 0 && diff < 60) shortIntervals++;
      }
    }

    return { interjornadaViolations, excessiveWorkdays, shortIntervals };
  }, [registros]);

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  /** Total de registros analisados — base de TODOS os percentuais da rosca. */
  const totalStatus = statusDistribution.reduce((soma, item) => soma + item.value, 0);

  /** Fatia dominante — com zero registros continua existindo, mas zerada. */
  const statusPrincipal = statusDistribution.reduce(
    (maior, item) => (item.value > maior.value ? item : maior),
    statusDistribution[0] ?? { name: '', value: 0 }
  );

  /**
   * Fatias do ANEL: os mesmos status, na mesma ordem e com as MESMAS cores da
   * legenda (`COLORS`) — nenhuma categoria/cor nova entra no gráfico.
   */
  const fatiasRosca = statusDistribution.map((item, indice) => ({
    label: item.name,
    value: item.value,
    color: COLORS[indice % COLORS.length],
  }));

  /**
   * Hora de pico do fluxo de entradas — DERIVADA da série EXIBIDA (registros
   * reais ou vitrine demonstrativa), nunca fixa nem copiada de lugar nenhum.
   */
  const horarioPico = serieFluxo.reduce(
    (pico, item) => (item.count > pico.count ? item : pico),
    serieFluxo[0] ?? { hour: '00:00', count: 0 }
  );

  /**
   * Topo do eixo Y do gráfico de barras: múltiplo de 4 logo acima do pico. Com
   * isso a barra mais alta NUNCA encosta no topo (sobra espaço para o rótulo do
   * pico) e os 5 rótulos do eixo continuam inteiros.
   */
  const topoEixoEntradas = Math.max(4, Math.ceil((horarioPico.count + 1) / 4) * 4);
  const rotulosEixoEntradas = [
    topoEixoEntradas,
    (topoEixoEntradas * 3) / 4,
    topoEixoEntradas / 2,
    topoEixoEntradas / 4,
    0,
  ];

  /**
   * CRESCIMENTO das barras — a coreografia do card "2. Visualize o impacto"
   * (`ui/crescimentoBarras.ts`): 900 ms por barra, 100 ms entre elas,
   * ease-in-out senoidal, com o progresso em variáveis CSS do contêiner
   * (`--crescimento-barra-<i>`). As barras apenas LEEM a variável
   * (`estiloCrescimentoBarra`), então nenhum re-render, hover ou tooltip
   * reinicia a subida — e ela parte quando o gráfico entra em exibição.
   */
  const refBarras = useCrescimentoBarras({
    total: serieFluxo.length,
    ativo: entradasEmVista,
    reduzir: reduzirMovimento,
  });

  /**
   * DICA DO GRÁFICO DE BARRAS — uma caixa por coluna, ancorada na própria
   * barra (não segue o mouse). `indiceAtivo` guarda SÓ qual coluna está sob o
   * ponteiro; a posição é escrita direto no DOM dentro de um `useLayoutEffect`,
   * que roda antes do primeiro quadro pintado — a caixa nunca aparece no canto
   * errado e nenhum `setState` extra acontece por movimento de mouse.
   */
  const [indiceAtivo, setIndiceAtivo] = useState<number | null>(null);
  const refDica = useRef<HTMLDivElement | null>(null);
  const refColunaAtiva = useRef<HTMLDivElement | null>(null);

  /** Item da série sob o ponteiro (`null` = nenhuma dica aberta). */
  const itemAtivo = indiceAtivo !== null ? (serieFluxo[indiceAtivo] ?? null) : null;

  /**
   * POSIÇÃO DA DICA — medida no DOM, presa dentro do plot.
   *
   * A geometria sai de `getBoundingClientRect` (coluna ativa, barra e área do
   * gráfico): acompanha a escala rem do sistema e a responsividade sem nenhum
   * número mágico de layout, e garante o pedido de "não sair dos limites
   * visíveis do gráfico" nos dois eixos.
   */
  useLayoutEffect(() => {
    const dica = refDica.current;
    const plot = refGraficoEntradas.current;
    const coluna = refColunaAtiva.current;
    if (!dica || !plot || !coluna) return;

    const caixaPlot = plot.getBoundingClientRect();
    const caixaDica = dica.getBoundingClientRect();
    const caixaColuna = coluna.getBoundingClientRect();
    const caixaBarra = (coluna.querySelector<HTMLElement>('[data-barra]') ?? coluna).getBoundingClientRect();

    /** Folga entre a caixa e o topo da barra. */
    const FOLGA = 6;

    // Horizontal: centro da coluna, preso às duas bordas do gráfico.
    const centro = caixaColuna.left + caixaColuna.width / 2 - caixaPlot.left;
    const esquerda = Math.min(
      Math.max(centro - caixaDica.width / 2, 0),
      Math.max(0, caixaPlot.width - caixaDica.width)
    );

    // Vertical: acima da barra, preso entre o topo do plot e o pé da caixa —
    // numa barra alta (a de pico) a dica encosta no topo e a barra continua
    // legível abaixo dela, em vez de a caixa descer por cima do desenho.
    const acimaDoTopo = caixaBarra.top - caixaPlot.top - caixaDica.height - FOLGA;
    const topo = Math.min(Math.max(acimaDoTopo, 0), Math.max(0, caixaPlot.height - caixaDica.height));

    dica.style.left = `${esquerda}px`;
    dica.style.top = `${topo}px`;
  }, [indiceAtivo, serieFluxo]);

  /** Os três indicadores estratégicos — MESMOS dados de antes, layout compacto. */
  const estrategicos = [
    {
      chave: 'previsao',
      rotulo: 'Custo Projetado (Horas)',
      valor: `${Math.round(monthlyForecast.projection)}h`,
      sufixo: '/ mês',
      destaque: <>Baseado na média de {monthlyForecast.last7DaysAverage.toFixed(1)}h diárias</>,
      Icone: BrainCircuit,
      pele: 'from-primary/10 to-transparent border-primary/20',
      chip: 'bg-primary/20 text-primary',
      tintaValor: 'text-primary',
      selo: {
        texto: 'Previsão IA',
        variante: monthlyForecast.isOverBudget ? ('destructive' as const) : ('secondary' as const),
      },
    },
    {
      chave: 'passivo',
      rotulo: 'Riscos de Passivo',
      valor: complianceStats.interjornadaViolations > 0 ? 'ALTO RISCO' : 'BAIXO RISCO',
      sufixo: null,
      destaque: `${complianceStats.interjornadaViolations} violações de interjornada detectadas`,
      Icone: Gavel,
      pele:
        complianceStats.interjornadaViolations > 0
          ? 'from-destructive/10 to-transparent border-destructive/20'
          : 'from-success/10 to-transparent border-success/20',
      chip:
        complianceStats.interjornadaViolations > 0
          ? 'bg-destructive/20 text-destructive'
          : 'bg-success/20 text-success',
      tintaValor: complianceStats.interjornadaViolations > 0 ? 'text-destructive' : 'text-success',
      selo: { texto: 'Compliance CLT', variante: 'outline' as const },
    },
    {
      chave: 'assiduidade',
      rotulo: 'Taxa de Assiduidade',
      valor: '94.2%',
      sufixo: null,
      destaque: (
        <>
          <Zap className="h-3 w-3 text-success" /> +2.1% em relação ao mês anterior
        </>
      ),
      Icone: TrendingUp,
      pele: 'from-info/10 to-transparent border-info/20',
      chip: 'bg-info/20 text-info',
      tintaValor: 'text-info',
      selo: { texto: 'Produtividade', variante: 'outline' as const },
    },
  ];

  /**
   * As três regras monitoradas — mesmos textos da CLT, mesma contagem real.
   *
   * PELE (estado NORMAL, sem depender de hover): base escura do tema +
   * radial de glow no TOPO (concentra a luz na faixa superior, como na
   * referência) + linear curto da cor semântica até o `--card`. `brilho` fecha
   * a profundidade com um realce interno de 1px (hairline) e um glow externo
   * curto — 30px de spread negativo, para dar relevo sem virar neon.
   *
   * Nada de dado novo aqui: `ocorrencias` continua vindo de `complianceStats`.
   */
  const riscos = [
    {
      chave: 'interjornada',
      rotulo: 'Interjornada',
      ocorrencias: complianceStats.interjornadaViolations,
      Icone: ShieldCheck,
      pele: 'border-success/45 bg-[radial-gradient(130%_95%_at_18%_-12%,hsl(var(--success)/0.30),transparent_62%),linear-gradient(168deg,hsl(var(--success)/0.16),hsl(var(--card))_88%)]',
      brilho:
        'shadow-[inset_0_1px_0_0_hsl(var(--success)/0.28),inset_0_-14px_26px_-20px_hsl(0_0%_0%/0.55),0_14px_30px_-26px_hsl(var(--success)/0.65)]',
      tinta: 'text-success',
      seloAlerta: 'destructive' as const,
      descricao:
        'A CLT exige 11h consecutivas de descanso entre jornadas. O sistema detectou possíveis violações que podem gerar horas extras a 100%.',
    },
    {
      chave: 'jornada',
      rotulo: 'Jornada Excedente',
      ocorrencias: complianceStats.excessiveWorkdays,
      Icone: Clock,
      pele: 'border-warning/45 bg-[radial-gradient(130%_95%_at_18%_-12%,hsl(var(--warning)/0.28),transparent_62%),linear-gradient(168deg,hsl(var(--warning)/0.16),hsl(var(--card))_88%)]',
      brilho:
        'shadow-[inset_0_1px_0_0_hsl(var(--warning)/0.26),inset_0_-14px_26px_-20px_hsl(0_0%_0%/0.55),0_14px_30px_-26px_hsl(var(--warning)/0.6)]',
      tinta: 'text-warning',
      seloAlerta: 'warning' as const,
      descricao:
        'Jornadas acima de 10h diárias são proibidas por lei, salvo exceções específicas. Mantenha o monitoramento ativo.',
    },
    {
      chave: 'intervalo',
      rotulo: 'Intervalo Mínimo',
      ocorrencias: complianceStats.shortIntervals,
      Icone: AlertTriangle,
      pele: 'border-info/45 bg-[radial-gradient(130%_95%_at_18%_-12%,hsl(var(--info)/0.28),transparent_62%),linear-gradient(168deg,hsl(var(--info)/0.16),hsl(var(--card))_88%)]',
      brilho:
        'shadow-[inset_0_1px_0_0_hsl(var(--info)/0.26),inset_0_-14px_26px_-20px_hsl(0_0%_0%/0.55),0_14px_30px_-26px_hsl(var(--info)/0.6)]',
      tinta: 'text-info',
      seloAlerta: 'warning' as const,
      descricao:
        'Intervalos inferiores a 1h (para jornadas acima de 6h) são passíveis de indenização. Automatize alertas para os gestores.',
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── 1 · Gráficos: rosca de status (35% rosca · 65% lista) e fluxo de
             entradas por horário em barras verticais ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Rosca + lista de status: 35% do card para o gráfico, 65% para a lista */}
        <Card className="flex flex-col overflow-hidden rounded-2xl border border-border/40 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border/40 bg-muted/30 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-display">
              <Users className="h-4 w-4 text-primary" /> Distribuição de Status
            </CardTitle>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{totalStatus} registros</span>
          </CardHeader>
          {/* `flex-1 items-center`: quando o card vizinho (Fluxo de Entradas)
              define a altura da linha, rosca + legenda ficam centradas na
              altura DISPONÍVEL em vez de sobrar espaço morto no pé — sem
              mexer na altura externa do card. */}
          <CardContent className="flex flex-1 items-center p-4">
            <div className="flex w-full flex-col items-center gap-4 sm:flex-row">
              <div
                ref={refRosca}
                className="relative aspect-square w-[150px] shrink-0 sm:w-[35%] sm:max-w-[168px] sm:min-w-[132px]"
              >
                {totalStatus > 0 ? (
                  <>
                    {/* CAMADA 1 — SENSOR invisível (ver o bloco de comentário acima):
                        mantém hover + `TooltipGrafico` do Recharts com os mesmos
                        dados, ângulos e `paddingAngle` de antes. `fillOpacity={0}`
                        deixa os setores transparentes SEM tirá-los do hit-test. */}
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="62%"
                          outerRadius="90%"
                          paddingAngle={3}
                          startAngle={90}
                          endAngle={-270}
                          // O Recharts nasce com `stroke="#fff"` no defaultProps do
                          // `<Pie>` (`lib/polar/Pie.js`): era ele o contorno branco
                          // em volta de cada fatia. `stroke="none"` + `strokeWidth={0}`
                          // remove a linha SEM mexer em dados, proporções ou ângulos.
                          stroke="none"
                          strokeWidth={0}
                          fillOpacity={0}
                          // A animação do gráfico é a do ANEL (camada 2), não a
                          // interpolação de ângulos do Recharts.
                          isAnimationActive={false}
                        >
                          {statusDistribution.map((entrada, indice) => (
                            <Cell key={`cell-${entrada.name}`} fill={COLORS[indice % COLORS.length]} />
                          ))}
                        </Pie>
                        {/* DICA — o conteúdo é o padrão de rosca COMPARTILHADO
                            (`ConteudoTooltipRosca`), o MESMO do card "Composição
                            do Passivo": caixa escura do Design System
                            (`bg-card`, borda discreta, `rounded-lg`,
                            `shadow-md`), uma linha `categoria : quantidade` na
                            COR DA FATIA e entrada só por opacidade (150 ms).
                            Sem ele, o `TooltipGrafico` caía no
                            `DefaultTooltipContent` do Recharts — a caixa
                            BRANCA de cantos retos que aparecia sobre o
                            percentual central. A posição continua sendo a do
                            Recharts (ancorada no ponteiro, com o mesmo `offset`
                            e o mesmo limite de área da referência) e NÃO
                            anima (ver `ui/tooltipGrafico.tsx`).
                            `zIndex` é o ÚNICO acréscimo local: aqui a rosca tem
                            um KPI no centro (`absolute inset-0`, irmão POSTERIOR
                            do `.recharts-wrapper`), que pintaria POR CIMA da
                            caixa. Na referência não existe esse vizinho, então o
                            `z-index` não muda nada lá. */}
                        <TooltipGrafico wrapperStyle={{ zIndex: 10 }} content={<ConteudoTooltipRosca />} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* CAMADA 2 — PINTURA: o MESMO anel animado do "Tipo de Vínculo"
                        (traçado progressivo, 1,8 s por segmento, 0,15 s entre eles).
                        Solo de leitura: `pointer-events-none` deixa o hover e o
                        tooltip com a camada 1. */}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 100 100"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    >
                      <AnelDonut
                        segments={fatiasRosca}
                        center={ROSCA_CENTRO}
                        radius={ROSCA_RAIO}
                        strokeWidth={ROSCA_ESPESSURA}
                        gap={ROSCA_VAO}
                        strokeLinecap="butt"
                        emVista={roscaEmVista}
                        reduzido={reduzirMovimento}
                      />
                    </svg>
                  </>
                ) : (
                  <div className="grid h-full place-items-center rounded-full border border-dashed border-border/60 px-3 text-center text-[10px] leading-tight text-muted-foreground">
                    Sem registros
                  </div>
                )}
                {totalStatus > 0 && (
                  /* Centro da rosca: o percentual é o elemento DOMINANTE.
                     `text-[19px]` = 19px arbitrário → 1,1875rem → ~23,8px com a
                     base de 20px do DS (≈ +19% sobre o `text-base` anterior),
                     `font-semibold` conforme a régua e `leading-none` para que o
                     bloco centralize exatamente no eixo do anel.

                     O bloco entra JUNTO com o desenho do arco, com a MESMA curva
                     e o MESMO primeiro atraso da legenda do "Tipo de Vínculo"
                     (`VINCULO_LEGENDA`): `scale` 0,94 → 1 + fade, sem deslocar o
                     centro do anel. O estado escondido mora no `animate` (e não
                     no `initial`) porque a página é montada dentro de um
                     `<AnimatePresence initial={false}>` (`layout/PageTransition`),
                     que descarta o `initial` de quem monta junto com a página. */
                  <motion.div
                    initial={false}
                    animate={roscaEmVista ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 }}
                    transition={{
                      duration: reduzirMovimento ? 0 : VINCULO_LEGENDA.duracaoS,
                      delay: reduzirMovimento ? 0 : VINCULO_LEGENDA.atrasosS[0],
                      ease: VINCULO_LEGENDA.curva,
                    }}
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center"
                  >
                    <span className="font-display text-[19px] font-semibold leading-none tabular-nums text-foreground">
                      {Math.round((statusPrincipal.value / totalStatus) * 100)}%
                    </span>
                    <span className="max-w-full truncate text-[10px] leading-none text-muted-foreground">
                      {statusPrincipal.name}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Legenda em TRÊS colunas de largura fixa: (1) ponto + nome,
                  (2) percentual em coluna de largura IGUAL em todas as linhas,
                  (3) quantidade. Percentual e quantidade alinhados à direita.
                  `py-[9px]` = 18px de vão entre linhas (faixa 14–18px) e o
                  total continua mais baixo que a rosca — o card não cresce. */}
              <ul className="w-full min-w-0 flex-1 divide-y divide-border/40">
                {statusDistribution.map((item, indice) => {
                  const pct = totalStatus > 0 ? Math.round((item.value / totalStatus) * 100) : 0;
                  return (
                    // `motion.li` continua sendo o MESMO `<li>` (o `divide-y`
                    // funciona igual): muda só a entrada — slide-in de 20px + fade,
                    // 400 ms, com o atraso sequencial de `atrasoLegenda` (100 / 300 /
                    // 500 / 700 ms), a MESMA cascata da legenda do "Tipo de Vínculo".
                    // O estado escondido mora no `animate` porque o
                    // `<AnimatePresence initial={false}>` da página
                    // (`layout/PageTransition`) descarta o `initial` de quem monta
                    // junto com ela.
                    <motion.li
                      key={item.name}
                      initial={false}
                      animate={roscaEmVista ? { opacity: 1, x: 0 } : { opacity: 0, x: VINCULO_LEGENDA.deslocamentoX }}
                      transition={{
                        duration: reduzirMovimento ? 0 : VINCULO_LEGENDA.duracaoS,
                        delay: reduzirMovimento ? 0 : atrasoLegenda(indice),
                        ease: VINCULO_LEGENDA.curva,
                      }}
                      className="flex items-center gap-2.5 py-[9px] first:pt-0 last:pb-0"
                    >
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: COLORS[indice % COLORS.length] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{item.name}</span>
                      <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                        {pct}%
                      </span>
                      <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                        {item.value}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Barras verticais por hora: pico destacado e rótulo derivado dos dados */}
        <Card className="overflow-hidden rounded-2xl border border-border/40 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border/40 bg-muted/30 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-display">
              <Activity className="h-4 w-4 text-info" /> Fluxo de Entradas por Horário
            </CardTitle>
            {horarioPico.count > 0 && (
              <Badge
                variant="outline"
                size="sm"
                className="shrink-0 gap-1 border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
              >
                <Zap className="h-3 w-3" />
                Pico: {horarioPico.hour} ({horarioPico.count} {horarioPico.count === 1 ? 'entrada' : 'entradas'})
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex gap-2">
              {/* Eixo Y — cinco rótulos inteiros, derivados do pico */}
              <div className="flex h-[150px] shrink-0 flex-col justify-between text-right text-[9px] leading-none tabular-nums text-muted-foreground">
                {rotulosEixoEntradas.map((rotulo) => (
                  <span key={`eixo-${rotulo}`}>{rotulo}</span>
                ))}
              </div>

              <div className="min-w-0 flex-1">
                <div ref={refGraficoEntradas} className="relative h-[150px]">
                  {/* Linhas de grade discretas, uma por rótulo do eixo */}
                  <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                    {rotulosEixoEntradas.map((rotulo) => (
                      <div key={`grade-${rotulo}`} className="h-px w-full bg-border/50" />
                    ))}
                  </div>

                  {/* `refBarras`: contêiner onde o controlador do crescimento
                      escreve `--crescimento-barra-<i>` (as barras leem dali). */}
                  <div
                    ref={refBarras}
                    className="relative flex h-full items-end gap-1"
                    onMouseLeave={() => setIndiceAtivo(null)}
                  >
                    {serieFluxo.map((item, indice) => {
                      const altura = topoEixoEntradas > 0 ? (item.count / topoEixoEntradas) * 100 : 0;
                      const ativa = indiceAtivo === indice;
                      return (
                        <div
                          key={item.hour}
                          // Hora sem entrada não abre dica: não há barra sob o mouse.
                          onMouseEnter={
                            item.count > 0
                              ? (evento) => {
                                  refColunaAtiva.current = evento.currentTarget;
                                  setIndiceAtivo(indice);
                                }
                              : undefined
                          }
                          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                        >
                          {/* Barra com o acabamento do card "2. Visualize o
                              impacto": preenchimento TRANSLÚCIDO do próprio lime
                              + contorno de MESMA cor e MESMA espessura (1,5px)
                              em todas as colunas — a barra de pico NÃO tem
                              contorno mais grosso nem número fixo acima dela; o
                              valor da hora aparece na dica (hover) e o pico é
                              comunicado pelo selo do cabeçalho. O crescimento
                              vertical NÃO é animado aqui — o `<div>` lê o
                              `scaleY` da variável CSS escrita pelo controlador,
                              então hover/re-render não reiniciam. Hora SEM
                              entrada não pinta nada: com altura zero, uma borda
                              de 1,5px viraria uma linha no eixo. */}
                          <div
                            data-barra=""
                            style={{ ...estiloCrescimentoBarra(indice), height: `${altura}%` }}
                            className={cn(
                              'w-full rounded-t-[3px]',
                              item.count > 0 && 'border-[1.5px] border-primary bg-primary/20 transition-colors',
                              // Sob o ponteiro: leve aumento de luminosidade (mesmo
                              // lime, alpha maior) + borda destacada por `ring` — que
                              // pinta sem mexer em largura/altura nem no layout vizinho.
                              ativa && 'ring-1 ring-primary/40',
                              ativa && 'bg-primary/35'
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* DICA — fora do contêiner das barras (não desloca coluna
                      nenhuma) e `pointer-events-none`: o hover continua sendo
                      da barra. Só monta quando há coluna ativa, então a entrada
                      anima uma vez por aparição e não a cada troca de barra. */}
                  {itemAtivo && (
                    <DicaFluxoEntradas
                      elementoRef={refDica}
                      hour={itemAtivo.hour}
                      count={itemAtivo.count}
                      total={totalEntradasFluxo}
                      ehPico={itemAtivo.count > 0 && itemAtivo.hour === horarioPico.hour}
                      reduzido={reduzirMovimento}
                    />
                  )}
                </div>

                {/* Eixo X — só a hora (o intervalo 06:00 → 20:00 continua o mesmo) */}
                <div className="mt-1.5 flex gap-1">
                  {serieFluxo.map((item) => (
                    <span
                      key={`hora-${item.hour}`}
                      className="min-w-0 flex-1 text-center text-[9px] tabular-nums text-muted-foreground"
                    >
                      {item.hour.slice(0, 2)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 2 · Cabeçalho do painel estratégico (abaixo dos gráficos) ────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <h2 className="text-xl font-display font-medium">Painel de Gestão Estratégica</h2>
          <p className="text-sm text-muted-foreground">Monitoramento preditivo e conformidade MTP 671</p>
        </div>
        <Badge className="shrink-0 gap-1.5 border-success/30 bg-success/20 px-3 py-1.5 text-success">
          <ShieldCheck className="h-3.5 w-3.5" /> IA Monitorando
        </Badge>
      </div>

      {/* ── 3 · Três indicadores estratégicos compactos ──────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {estrategicos.map((indicador, indice) => (
          <motion.div key={indicador.chave} {...entradaCard(indice)} className="min-w-0">
            <Card className={cn('h-full overflow-hidden rounded-2xl border bg-gradient-to-br', indicador.pele)}>
              <CardContent className="relative flex h-full items-start gap-3 p-4">
                <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', indicador.chip)}>
                  <indicador.Icone className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="pr-14 text-[10px] font-medium uppercase leading-tight tracking-wider text-muted-foreground">
                    {indicador.rotulo}
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span
                      className={cn('font-display text-xl font-medium leading-none tabular-nums', indicador.tintaValor)}
                    >
                      {indicador.valor}
                    </span>
                    {indicador.sufixo && <span className="text-[10px] text-muted-foreground">{indicador.sufixo}</span>}
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-[10px] leading-relaxed text-muted-foreground">
                    {indicador.destaque}
                  </p>
                </div>

                <Badge variant={indicador.selo.variante} size="sm" className="absolute right-3 top-3 shrink-0">
                  {indicador.selo.texto}
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── 4 · Monitor de Riscos Trabalhistas: container ESCURO e discreto
             (gradiente do `--card` para o `--background`), cabeçalho neutro —
             o vermelho sai de cena e só a BALANÇA em lime identifica a seção —
             e TRÊS cards iguais com gradiente semântico + glow no topo. Todo o
             relevo é do ESTADO NORMAL: nada depende de hover. ─────────────── */}
      <Card className="overflow-hidden rounded-2xl border border-border/40 bg-[linear-gradient(168deg,hsl(var(--card))_0%,hsl(var(--background))_94%)] shadow-xs">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-border/40 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-display text-foreground">
            <Scale className="h-4 w-4 text-primary" /> Monitor de Riscos Trabalhistas (MTP 671 / CLT)
          </CardTitle>
          {/* ANIMAÇÃO: a MESMA da janela "Pendências" (`CascadeDialogFrame`,
              a moldura compartilhada de `ui/cascade-dialog` → números em
              `ui/cascade-motion.ts`): o véu entra em fade, a caixa nasce como um
              quadradinho e cresce (laterais, depois altura) e os blocos —
              cabeçalho, depois cada regra — entram em cascata. O fechamento é o
              inverso e vale para o X, o Escape e o clique fora; `blocks` alimenta
              o compasso da saída. Movimento reduzido passa pelo canal único do
              sistema (`MOTION_REDUCED_MODE`): a caixa continua entrando por
              opacidade, sem os transforms. */}
          <Button
            ref={refBotaoDetalhes}
            variant="outline"
            size="sm"
            aria-haspopup="dialog"
            aria-expanded={detalhesAbertos}
            onClick={() => setDetalhesAbertos(true)}
            className="h-7 shrink-0 gap-1.5 border-border/60 bg-background/40 px-2.5 text-[11px] text-foreground hover:bg-muted/60"
          >
            Ver detalhes <ArrowRight className="h-3 w-3" />
          </Button>

          <MotionConfig reducedMotion={MOTION_REDUCED_MODE}>
            <CascadeDialogFrame
              open={detalhesAbertos}
              onOpenChange={setDetalhesAbertos}
              blocks={1 + riscos.length}
              className="max-w-lg border-border rounded-none sm:rounded-lg"
              contentClassName="grid gap-2 p-5"
              onCloseAutoFocus={(evento) => {
                evento.preventDefault();
                refBotaoDetalhes.current?.focus();
              }}
            >
              <motion.div variants={cascadeItemVariants} className="mb-1">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <Scale className="h-4 w-4 text-primary" /> Monitor de Riscos Trabalhistas
                  </DialogTitle>
                  <DialogDescription>
                    Regras da CLT e do MTP 671 verificadas nos registros de ponto da competência.
                  </DialogDescription>
                </DialogHeader>
              </motion.div>

              {riscos.map((risco) => {
                const varianteSelo = risco.ocorrencias > 0 ? risco.seloAlerta : 'success';
                return (
                  <motion.div
                    key={`detalhe-${risco.chave}`}
                    variants={cascadeItemVariants}
                    className={cn('rounded-xl border p-3', risco.pele, risco.brilho)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
                        <risco.Icone className={cn('h-4 w-4 shrink-0', risco.tinta)} />
                        <span className="truncate">{risco.rotulo}</span>
                      </span>
                      <Badge
                        variant={varianteSelo}
                        size="sm"
                        className={cn('shrink-0 gap-1 tabular-nums', BORDA_SELO[varianteSelo])}
                      >
                        {risco.ocorrencias === 0 && <CheckCircle2 className="h-3 w-3" />}
                        {risco.ocorrencias} ocorrências
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{risco.descricao}</p>
                  </motion.div>
                );
              })}
            </CascadeDialogFrame>
          </MotionConfig>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {riscos.map((risco) => {
              const varianteSelo = risco.ocorrencias > 0 ? risco.seloAlerta : 'success';
              return (
                <div
                  key={risco.chave}
                  className={cn(
                    'relative flex h-full min-w-0 flex-col gap-2 overflow-hidden rounded-xl border p-3',
                    risco.pele,
                    risco.brilho
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <risco.Icone className={cn('h-[18px] w-[18px] shrink-0', risco.tinta)} />
                      {/* `flex-1` + sem `truncate`: em telas estreitas o rótulo
                          quebra em duas linhas em vez de virar "Interjorna…". */}
                      <span className="min-w-0 flex-1 text-[13px] font-medium leading-tight text-foreground">
                        {risco.rotulo}
                      </span>
                    </div>
                    <Badge
                      variant={varianteSelo}
                      size="sm"
                      className={cn('shrink-0 gap-1 tabular-nums', BORDA_SELO[varianteSelo])}
                    >
                      {risco.ocorrencias === 0 && <CheckCircle2 className="h-3 w-3" />}
                      {risco.ocorrencias} ocorrências
                    </Badge>
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">{risco.descricao}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
