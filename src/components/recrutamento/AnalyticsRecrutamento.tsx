import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { BarChart3, Briefcase, Users, Workflow, type LucideIcon } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { MotionCard, entradaCard } from '@/components/ui/entrada-cards';
import { CARD_INTERACAO_ESTATICO, CARD_INTERACAO_ICONE_ESTATICO } from '@/components/ui/interacao-cards';
import { cn } from '@/lib/utils';
import type { CandidatoRow, CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import { construirAnalytics, construirDetalheVagas, type KpiRecrutamento } from './analyticsComum';
import {
  FILTROS_PADRAO,
  VAGA_TODAS,
  filtrarEntradaAnalytics,
  type FiltrosAnalytics,
  type PeriodoAnalytics,
} from './analyticsFiltros';
import { baixarRelatorioCsv } from './analyticsRelatorio';
import { AnalyticsBarraFiltros } from './AnalyticsBarraFiltros';
import { AnalyticsFunil } from './AnalyticsFunil';
import { AnalyticsEvolucao } from './AnalyticsEvolucao';
import { AnalyticsOrigens } from './AnalyticsOrigens';
import { AnalyticsTempo } from './AnalyticsTempo';
import { AnalyticsAtencao } from './AnalyticsAtencao';
import { AnalyticsVagas } from './AnalyticsVagas';
import { AnalyticsIndicadores } from './AnalyticsIndicadores';
import { VariacaoKpi } from './AnalyticsVariacao';

/**
 * ============================================================================
 * ABA ANALYTICS — dashboard analítico do Recrutamento & Seleção
 *
 * Composição em quatro faixas, na densidade compacta da referência:
 *   1. TOPO ........ barra de recorte (período · vaga · exportar) + KPIs em
 *                    quatro colunas com ícone grande à esquerda;
 *   2. Visão geral .. funil por etapa, evolução mensal e origens;
 *   3. Operação ..... tempo por etapa, pontos de atenção e vagas;
 *   4. Indicadores .. tempo de contratação, candidatos/vaga, desistência e
 *                     aceitação de proposta, numa faixa única no rodapé.
 *
 * TODA a matemática mora em `analyticsComum.ts` (funções puras e testadas);
 * o recorte da barra de ações mora em `analyticsFiltros.ts` (também puro) e o
 * CSV do botão Exportar em `analyticsRelatorio.ts`. Aqui só existe
 * apresentação: tokens do Design System, ícones já usados no módulo,
 * `font-display`/`font-body` e a MESMA cascata de entrada do restante da tela
 * (`entradaCard`). Nenhum dado é criado nesta camada.
 *
 * HIERARQUIA DE FUNDOS (o ponto da refatoração): página em `--background`,
 * painéis em `--card` (`AnalyticsPainel`) e sub-elementos em
 * `analyticsVisual.SUPERFICIE_INTERNA` — cada degrau mais claro que o anterior
 * no tema escuro.
 *
 * RITMO (referência atual): cabeçalho em uma linha com os controles à direita,
 * quatro KPIs de ~90px na primeira faixa, funil largo + evolução + origens na
 * segunda, tempo/atenção/vagas na terceira e a faixa de indicadores (agora
 * dentro de um painel, como as demais) no rodapé. Os vãos são `gap-3` (15px
 * reais), o padding horizontal dos painéis é 20px e o vertical é o mínimo que
 * não aperta (10/6 no cabeçalho, 2,5/12,5 no corpo) — a densidade da referência,
 * com os números grandes (30px no KPI, 32px no funil) fazendo a leitura de
 * longe. A régua é a mesma nas quatro faixas: nenhuma delas "respira" mais que
 * a vizinha, e é isso que faz a página parecer uma grade e não cards soltos.
 * ============================================================================
 */
type TomKpi = 'success' | 'info' | 'chart4' | 'warning';

const KPI_VISUAL: Record<KpiRecrutamento['id'], { icone: LucideIcon; tom: TomKpi; tooltip: string }> = {
  vagas: {
    icone: Briefcase,
    tom: 'success',
    tooltip: 'Vagas com status aberta na base do recrutamento.',
  },
  candidatos: {
    icone: Users,
    tom: 'info',
    tooltip: 'Candidatos únicos cadastrados — cada pessoa conta uma vez, mesmo com mais de uma candidatura.',
  },
  processos: {
    icone: Workflow,
    tom: 'chart4',
    tooltip: 'Candidaturas que ainda não foram concluídas, canceladas, desistidas ou reprovadas.',
  },
  conversao: {
    icone: BarChart3,
    tom: 'warning',
    tooltip: 'Contratações concluídas divididas pelo total de candidaturas da base.',
  },
};

/**
 * Tinta de cada KPI — só o QUADRADO do ícone é colorido (como na referência):
 * fundo translúcido + borda do mesmo tom. Nada de halo, gradiente de topo ou
 * brilho: no card pequeno eles viravam ruído atrás do número.
 */
const ESTILO_KPI: Record<TomKpi, string> = {
  success: 'border-success/25 bg-success/12 text-success',
  info: 'border-info/25 bg-info/12 text-info',
  chart4: 'border-[hsl(var(--chart-4)/0.28)] bg-[hsl(var(--chart-4)/0.12)] text-[hsl(var(--chart-4))]',
  warning: 'border-warning/25 bg-warning/12 text-warning',
};

/**
 * KPI em linha, como na referência: ícone (45px reais) em quadrado arredondado
 * com tinta semântica à ESQUERDA; no centro, rótulo, número grande com a
 * variação à direita e a leitura de base do número embaixo. Altura de ~90px
 * reais (era 130px) — a faixa de quatro cards encosta no topo da tela como na
 * referência e devolve ~40px para as três faixas de painéis abaixo.
 *
 * AS MEDIDAS SÃO AS QUE CABEM: com a escala do app (base rem de 125%) cada card
 * da faixa de quatro fica com ~254px reais em 1440 de viewport e a coluna de
 * texto com ~166px. O ícone de 44px com `gap-3` e uma coluna fixa de variação
 * deixavam o rótulo com 17px medidos no navegador; ícone de 36px, `px-3` e a
 * variação no fim da linha do número (com `flex-wrap`) devolvem a largura para o
 * texto em qualquer tela. O padding vertical é o mínimo que não cola o texto na
 * borda: 10px reais em cima e embaixo.
 */
function KpiCard({ kpi, index }: { kpi: KpiRecrutamento; index: number }) {
  const visual = KPI_VISUAL[kpi.id];
  const Icone = visual.icone;
  const ehPercentual = kpi.id === 'conversao';

  return (
    // Mesmo opt-out da entrada por CSS do `AnalyticsPainel` (ver o comentário
    // lá): este KPI já entra por Framer (`entradaCard(index)`) e, sem o
    // atributo, a `.animate-squash` do `Card` rodaria junto — o card subia,
    // descia 14px ao fim do keyframe e subia de novo.
    <MotionCard
      {...entradaCard(index)}
      data-entrada="cascata"
      data-analytics-kpi={kpi.id}
      className={cn(
        'relative flex min-h-[70px] min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-border/55 bg-card px-3 py-2',
        CARD_INTERACAO_ESTATICO
      )}
    >
      {/* Container do ícone com 55px reais (era 45px): a referência pede 48–56px
          e é ele que dá o peso visual do card. O ícone sobe para 25px e o card
          mantém ~90px de altura (a faixa 88–96px da referência).
          SEM hover: o chip não escala mais no `:hover` do card (perfil
          `CARD_INTERACAO_ICONE_ESTATICO`, ver `ui/interacao-cards.ts`). O KPI é
          uma superfície de leitura — quem responde ao mouse é o `InfoTooltip`
          do rótulo, não o card. */}
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
          CARD_INTERACAO_ICONE_ESTATICO,
          ESTILO_KPI[visual.tom]
        )}
      >
        <Icone className="h-5 w-5" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1 text-[10.5px] font-medium leading-tight text-muted-foreground">
          <span className="truncate">{kpi.label}</span>
          <InfoTooltip content={visual.tooltip} side="top" align="start" />
        </p>

        {/* Número e variação na MESMA linha, com `flex-wrap`: se a coluna não
            comportar os dois (cards estreitos), a variação desce sozinha em vez
            de espremer o número. O número desce um degrau abaixo de `2xl`
            porque "8,3%" + "+11,1 p.p." não cabiam juntos em 1440 (medido: a
            linha quebrava e o card ficava mais alto que os vizinhos). */}
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <p className="font-display text-[24px] font-semibold leading-none tracking-tight tabular-nums text-foreground 2xl:text-[26px]">
            <AnimatedNumber
              value={kpi.valor}
              duration={0.9}
              decimals={ehPercentual ? 1 : 0}
              format={ehPercentual ? (numero) => `${numero.toFixed(1).replace('.', ',')}%` : undefined}
            />
          </p>
          {/* Variação empurrada para a direita: o rótulo completo da comparação
              (janela em dias) continua no `title` — a legenda visível é a curta. */}
          <VariacaoKpi tendencia={kpi.tendencia} />
        </div>

        <p className="mt-0.5 truncate text-[9px] leading-tight text-muted-foreground/80" title={kpi.apoio}>
          {kpi.apoio}
        </p>
      </div>
    </MotionCard>
  );
}

export function AnalyticsRecrutamento({
  candidaturas,
  vagas,
  candidatos,
}: {
  candidaturas: CandidaturaComRelacoes[];
  vagas: VagaRow[];
  candidatos: CandidatoRow[];
}) {
  const [filtros, setFiltros] = useState<FiltrosAnalytics>(FILTROS_PADRAO);

  // A vaga escolhida pode sair da base (nova carga, vaga excluída): nesse caso o
  // recorte volta para "Todas as vagas" em vez de renderizar uma tela vazia.
  const vagaEfetiva =
    filtros.vagaId === VAGA_TODAS || vagas.some((vaga) => vaga.id === filtros.vagaId) ? filtros.vagaId : VAGA_TODAS;

  const filtrosEfetivos = useMemo<FiltrosAnalytics>(
    () => ({ periodo: filtros.periodo, vagaId: vagaEfetiva }),
    [filtros.periodo, vagaEfetiva]
  );

  // O recorte acontece ANTES da matemática: todas as faixas leem o mesmo corte.
  const entrada = useMemo(
    () => filtrarEntradaAnalytics({ candidaturas, vagas, candidatos }, filtrosEfetivos),
    [candidaturas, vagas, candidatos, filtrosEfetivos]
  );
  const analytics = useMemo(() => construirAnalytics(entrada), [entrada]);

  /**
   * DETALHAMENTO DA JANELA "VER TODAS". Sai da MESMA base recortada e parte de
   * `construirDesempenhoVagas` (o cálculo do card), então candidatos,
   * contratações, conversão e ordem são idênticos aos do resumo. Só o que a
   * janela acrescenta — situação, departamento, "em processo", etapas e tempo
   * médio — vem de campos que a página já carrega. Nenhuma consulta nova.
   */
  const detalhesVagas = useMemo(
    () => construirDetalheVagas(entrada.vagas, entrada.candidaturas, analytics.referencia),
    [entrada, analytics.referencia]
  );

  const exportar = useCallback(() => {
    try {
      toast.success(`Relatório exportado: ${baixarRelatorioCsv(analytics)}`);
    } catch {
      toast.error('Não foi possível exportar o relatório.');
    }
  }, [analytics]);

  return (
    // O container é a régua: as faixas de 3 e 4 colunas só entram quando a
    // largura ÚTIL do `main` comporta os painéis (ver os comentários das
    // faixas). `@container` + `@min-[…]` mede isso direto; variante de viewport
    // erraria por causa da sidebar e da escala rem do Design System.
    <div data-analytics-recrutamento className="@container space-y-2.5">
      {/* Topo — título/contexto à esquerda, barra de recorte alinhada à direita,
          na MESMA linha de base dos controles (como na referência). */}
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[16px] font-semibold tracking-tight text-foreground">
            Visão analítica do recrutamento
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Funil, origens e desempenho derivados da base atual do módulo.
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-2.5 py-1 text-[10px] leading-none text-muted-foreground">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
            Base de referência: {format(analytics.referencia, 'dd MMM yyyy', { locale: ptBR })}
          </span>
        </div>
        <AnalyticsBarraFiltros
          filtros={filtrosEfetivos}
          vagas={vagas}
          onPeriodo={(periodo: PeriodoAnalytics) => setFiltros((atual) => ({ ...atual, periodo }))}
          onVaga={(vagaId) => setFiltros((atual) => ({ ...atual, vagaId }))}
          onExportar={exportar}
        />
      </div>

      {/* 1 · KPIs — quatro colunas iguais, mesma altura, sem card alto.
          Quatro colunas só quando o `main` tem ≥1060px úteis (`@min-[1060px]`):
          abaixo disso os quatro cards caem para ~205px, onde "Total de
          candidatos" pedia 117px numa caixa de 97px (medido em 1280). Entre
          520px e 1060px de container a faixa é 2×2. */}
      <div className="grid gap-2.5 @min-[520px]:grid-cols-2 @min-[1060px]:grid-cols-4">
        {analytics.kpis.map((kpi, indice) => (
          <KpiCard key={kpi.id} kpi={kpi} index={indice} />
        ))}
      </div>

      {/* 2 · Funil (maior largura) · Evolução (centro) · Origens (direita).
          Três colunas só com ≥1060px úteis no `main` — é a largura em que as
          medidas fecham: o funil fica com ~443px (chevrons de ~79px, o bastante
          para o rótulo "Contratado", 76px), a Evolução com ~306px de painel para
          "Evolução de candidaturas" (193px) no cabeçalho e as Origens com
          ~281px, que é o mínimo para a linha única (ícone · nome · volume ·
          barra · participação) não cortar "Indicação"/"Não informada". Somados
          dão os 1060px que o `main` tem em 1440 (443 + 306 + 281 + dois vãos de
          15px); abaixo disso três colunas ficariam com menos de 1/3 cada e três
          títulos voltariam a truncar (medido em 1280, com 900px). Ali a faixa é
          o par `@min-[560px]:grid-cols-2` com o funil em largura cheia. */}
      <div className="grid gap-2.5 @min-[560px]:grid-cols-2 @min-[1060px]:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,0.92fr)]">
        {/* `@container` aqui: a faixa de conversões DENTRO do funil mede este
            painel (443px em 1440), não o `main`. */}
        <div className="@container min-w-0 h-full @min-[560px]:col-span-2 @min-[1060px]:col-span-1">
          <AnalyticsFunil
            funil={analytics.funil}
            conversoes={analytics.conversoes}
            total={analytics.totalCandidaturas}
            index={4}
          />
        </div>
        <AnalyticsEvolucao candidaturas={entrada.candidaturas} referencia={analytics.referencia} index={5} />
        <AnalyticsOrigens origens={analytics.origens} index={6} />
      </div>

      {/* 3 · Tempo por etapa · Pontos de atenção · Desempenho por vaga.
          Três colunas só com ≥1060px úteis. As proporções foram REBALANCEADAS
          nesta revisão: 1.06 / 0.95 / 1.16 (≈ 401 / 360 / 439 reais numa área útil
          de ~1200px). Antes era 1.14 / 0.92 / 1 e o card de vagas ficava com
          ~394px, largura em que as cinco colunas da linha de vaga (nome ·
          volume · barra · percentual) não cabiam junto com o volume "5
          candidatos" e TODO nome virava "Analista de…". Os dois cards que ganharam
          texto maior (atenção e vagas) ganharam largura; o de tempo cedeu 48px e
          continua com cinco ladrilhos de ~66px, largura em que "Contratado"
          (58px) ainda cabe.
          ALTURA: sem piso. O grid é `stretch` (padrão), então as três colunas
          terminam na MESMA linha horizontal — mas quem define essa linha é o
          conteúdo (três alertas de duas linhas, quatro vagas, cinco ladrilhos),
          não um `min-h` arbitrário. */}
      <div className="grid gap-2.5 @min-[1060px]:grid-cols-[minmax(0,1.06fr)_minmax(0,0.95fr)_minmax(0,1.16fr)] @min-[1060px]:items-stretch">
        <AnalyticsTempo tempos={analytics.tempos} index={7} />
        <AnalyticsAtencao atencao={analytics.atencao} index={8} />
        <AnalyticsVagas vagas={analytics.vagas} detalhes={detalhesVagas} index={9} />
      </div>

      {/* 4 · Indicadores gerais — um painel com título próprio (a única faixa
          com um painel só) e os quatro indicadores em linha dentro dele. */}
      <AnalyticsIndicadores indicadores={analytics.indicadores} referencia={analytics.referencia} index={10} />
    </div>
  );
}
