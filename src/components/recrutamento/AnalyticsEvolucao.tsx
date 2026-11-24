import { useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { CLASSE_ENTRADA_TOOLTIP, TooltipGrafico } from '@/components/ui/tooltipGrafico';
import { ClipRevelacaoGrafico } from '@/components/ui/revelacaoGrafico';
import { slotSequencial } from '@/components/ui/entradaGlobal';
import { ChartNoAxesCombined } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';
import type { CandidaturaComRelacoes } from '@/types/recrutamento';
import { construirEvolucao, type PontoEvolucao } from './analyticsComum';
import { AnalyticsPainel } from './AnalyticsPainel';
import { SELECT_PAINEL, SUPERFICIE_SUAVE } from './analyticsVisual';

/**
 * EVOLUÇÃO DE CANDIDATURAS — área (candidaturas) + linha (contratações).
 *
 * O recorte é local (3/6/12 meses) e termina no mês da data de referência da
 * base. O gráfico usa só tokens do sistema (`--info`, `--success`, `--border`,
 * `--muted-foreground`) e o mesmo casco dos demais painéis. Sem dados, mostra
 * um estado vazio curto em vez de um eixo vazio.
 *
 * ── ANIMAÇÃO (a MESMA do card "Visão Geral da Empresa") ────────────────────
 * As duas séries são reveladas da esquerda para a direita por um `<clipPath>`
 * animado (2,5 s, `easeInOut`), exatamente como no Dashboard Principal/
 * Executivo — a implementação é a de `ui/revelacaoGrafico.tsx`, fonte única do
 * gesto, não uma cópia parecida. Nada aqui usa a animação nativa do Recharts
 * (`isAnimationActive={false}` nas duas séries): as duas brigariam pelo mesmo
 * traçado.
 *
 * O GATILHO é o do próprio módulo (`AnalyticsFunil`): a varredura só começa
 * quando a entrada do painel terminou (`useEntradaCardConcluida`) — desenhar
 * antes disso gastaria a primeira fração da animação atrás do fade do card. O
 * estado é monotônico: hover, tooltip, legenda, troca de recorte e re-render
 * NÃO reiniciam o desenho; só sair da página e voltar (remontagem).
 *
 * CONTROLES: o recorte de meses muda os DADOS, não a revelação — o retângulo
 * do clip já está em 100% e continua lá; o gráfico apenas redesenha no novo
 * conjunto de pontos, sem varredura nova.
 */

const PERIODOS = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
] as const;

type ItemTooltip = { name?: string; value?: number | string; color?: string };

function TooltipEvolucao({ active, label, payload }: { active?: boolean; label?: string; payload?: ItemTooltip[] }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className={`rounded-xl border border-border/60 bg-popover px-3 py-2 text-popover-foreground shadow-xl ${CLASSE_ENTRADA_TOOLTIP}`}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-1.5 text-[11px] leading-relaxed">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-semibold tabular-nums text-foreground">{item.value}</span>
        </p>
      ))}
    </div>
  );
}

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: cor }} />
      {label}
    </span>
  );
}

export function AnalyticsEvolucao({
  candidaturas,
  referencia,
  index,
}: {
  candidaturas: CandidaturaComRelacoes[];
  referencia: Date;
  index: number;
}) {
  const [meses, setMeses] = useState<number>(6);
  const serie: PontoEvolucao[] = useMemo(
    () => construirEvolucao(candidaturas, meses, referencia),
    [candidaturas, meses, referencia]
  );
  const temDados = serie.some((ponto) => ponto.candidaturas > 0 || ponto.contratacoes > 0);

  /* ─── GATILHO DA REVELAÇÃO (uma vez por montagem) ──────────────────────────
   * `useEntradaCardConcluida` é o mecanismo do próprio módulo (o mesmo do
   * `AnalyticsFunil`) e ouve o `onAnimationComplete` REAL do `MotionCard` do
   * painel: a varredura só começa quando o card terminou de entrar (fade + 14px
   * da régua global, com o atraso do slot `index`). Desenhar antes disso gastaria
   * a primeira fração da animação atrás do fade do card — a "sincronização com a
   * entrada do container" pedida.
   *
   * O estado é monotônico: uma vez `true`, fica `true`. Hover no painel, tooltip,
   * interação com a legenda, atualização de dados, troca do recorte de meses e
   * qualquer re-render NÃO reiniciam o desenho — o `motion.rect` do clip é o
   * MESMO nó do React e já está em 100%. Só sair da página e voltar (remontagem
   * do painel) rearma a revelação.
   *
   * (Não há `useInView` aqui: ao contrário do Funil, este painel já nasce com
   * eixos, grade e legenda pintados, então o observador só adiaria a varredura
   * deixando as SÉRIES escondidas enquanto o card aparece na dobra.)
   *
   * MOVIMENTO REDUZIDO: `animar` nasce `true` e o clip monta já revelado
   * (`semMovimento`), sem espera e sem varredura.
   * ─────────────────────────────────────────────────────────────────────── */
  const reduzirMovimento = useMovimentoReduzido();
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(index, slotSequencial);

  const animar = reduzirMovimento || entradaConcluida;

  /** Clip de revelação das duas séries (ver `ui/revelacaoGrafico.tsx`). */
  const idRevelacao = 'recrutamento-evolucao-reveal-clip';

  // Seletor da janela: mora no CABEÇALHO do painel, alinhado ao canto superior
  // direito (slot `action` do casco), à direita do título e do subtítulo. Antes
  // ele dividia a linha da legenda no rodapé; lá competia com as duas séries e,
  // no cabeçalho, é o único controle do painel — a leitura é "título à
  // esquerda, janela à direita", como na referência. O gráfico continua com a
  // altura cheia porque o rodapé agora carrega só a legenda.
  const seletorPeriodo = (
    <Select value={String(meses)} onValueChange={(valor) => setMeses(Number(valor))}>
      <SelectTrigger aria-label="Período da evolução de candidaturas" className={SELECT_PAINEL}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {PERIODOS.map((periodo) => (
          <SelectItem key={periodo.value} value={String(periodo.value)} className="text-[11.5px]">
            {periodo.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <AnalyticsPainel
      icon={ChartNoAxesCombined}
      title="Evolução de candidaturas"
      subtitle="Candidaturas × contratações"
      action={seletorPeriodo}
      titleClassName="line-clamp-2 whitespace-normal"
      tom="info"
      index={index}
      aoConcluirEntrada={aoConcluirEntrada}
    >
      {!temDados ? (
        <div
          className={`flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-8 text-center ${SUPERFICIE_SUAVE}`}
        >
          <ChartNoAxesCombined className="h-5 w-5 text-muted-foreground/40" aria-hidden />
          <p className="text-[12px] font-medium text-foreground/80">Sem movimentações no período</p>
          <p className="max-w-[240px] text-[10.5px] leading-snug text-muted-foreground">
            Escolha outro recorte ou acompanhe a evolução quando novas candidaturas entrarem.
          </p>
        </div>
      ) : (
        // Altura do gráfico: era `min-h-[220px]` e, como este é o painel mais
        // alto da faixa, era ELE que definia a altura dos três (o Funil e as
        // Origens esticavam junto por `h-full`). Depois 128px, 90px e agora
        // 116px de projeto (145px reais): o gráfico volta a ser o miolo do card
        // — ocupa a maior parte da região disponível, como na referência, em vez
        // de boiar num painel mais alto que ele. O cabeçalho continua em duas
        // linhas (título e subtítulo não cabem em uma ao lado do seletor), e o
        // `flex-1` deixa o desenho absorver a sobra da faixa quando o Funil ou
        // as Origens forem mais altos. O valor é múltiplo de 4 para não gerar
        // meio pixel.
        <div className="relative mt-1 min-h-[116px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="recrutamento-evolucao-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0} />
                </linearGradient>
                {/* Revelação compartilhada com o card "Visão Geral da Empresa":
                    retângulo que cresce de 0 a 100% da largura e descobre as
                    duas séries da esquerda para a direita (2,5 s, `easeInOut`). */}
                <ClipRevelacaoGrafico id={idRevelacao} animar={animar} semMovimento={reduzirMovimento} />
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="rotulo"
                tickLine={false}
                axisLine={false}
                dy={5}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={30}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <TooltipGrafico
                cursor={{ stroke: 'hsl(var(--info))', strokeDasharray: '4 4', strokeOpacity: 0.6 }}
                content={<TooltipEvolucao />}
              />
              <Area
                type="monotone"
                dataKey="candidaturas"
                name="Candidaturas"
                stroke="hsl(var(--info))"
                strokeWidth={2}
                fill="url(#recrutamento-evolucao-fill)"
                dot={{ r: 2, fill: 'hsl(var(--info))', strokeWidth: 0 }}
                activeDot={{ r: 4, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                isAnimationActive={false}
                clipPath={`url(#${idRevelacao})`}
              />
              {/* Contratações — `<Area fill="none">` no lugar do `<Line>`: o
                  Recharts 3 sobrescreve a prop `clipPath` do `<Line>`
                  (`cartesian/Line.js` → `StaticCurve`), então a linha não
                  poderia ser revelada pelo clip compartilhado e apareceria
                  inteira de uma vez, fora de sincronia com a área azul. A área
                  sem preenchimento renderiza EXATAMENTE a mesma curva aberta do
                  `<Line>` (mesma `Curve`, mesmo `type="monotone"`, mesmo
                  `strokeWidth`), com os mesmos pontos, `activeDot` e cor do
                  tooltip (`getLegendItemColor` devolve o `stroke`). Nada muda
                  visualmente: só a revelação passa a valer para as duas séries. */}
              <Area
                type="monotone"
                dataKey="contratacoes"
                name="Contratações"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="none"
                dot={{ r: 2, fill: 'hsl(var(--success))', strokeWidth: 0 }}
                activeDot={{ r: 4, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                isAnimationActive={false}
                clipPath={`url(#${idRevelacao})`}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legenda embaixo do gráfico, na linha do eixo temporal — como na
          referência: o gráfico ocupa o painel e a legenda fecha a faixa. Sem o
          seletor (que subiu para o cabeçalho), a linha fica só com as duas
          séries e pode quebrar à vontade (`flex-wrap`) sem empurrar controle
          nenhum para o canto. */}
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
        <Legenda cor="hsl(var(--info))" label="Candidaturas" />
        <Legenda cor="hsl(var(--success))" label="Contratações" />
      </div>
    </AnalyticsPainel>
  );
}
