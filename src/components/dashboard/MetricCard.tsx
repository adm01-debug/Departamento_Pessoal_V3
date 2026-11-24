import { Card, CardContent } from '@/components/ui/card';
import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';
import { MiniSparkline } from './MiniSparkline';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { entradaCardGlobal } from '@/components/ui/entradaGlobal';
import { CARD_INTERACAO, CARD_INTERACAO_ICONE } from '@/components/ui/interacao-cards';

const MotionCard = motion.create(Card);

/**
 * ENTRADA DE CARD DO SISTEMA — `cardVariants` é, hoje, a RÉGUA GLOBAL.
 *
 * O objeto abaixo é literalmente `entradaCardGlobal`
 * (`components/ui/entradaGlobal.ts`): fade de opacidade + subida de 14px, 520ms
 * por card, 120ms entre o início de um card e o do próximo, `ease-out` puro —
 * os números validados no Dashboard Executivo (a referência do sistema).
 *
 * O NOME foi mantido porque ~70 arquivos (Admissões, Desligamentos,
 * Recrutamento, Colaboradores, Premiações, Ponto, Treinamentos…) o importam:
 * trocar o import de todos eles não mudaria um pixel de animação, então não foi
 * feito. Nenhum componente deve declarar números próprios de entrada — calibrar
 * a cascata do app é mexer em `ui/entradaGlobal.ts`.
 *
 * A ÚNICA exceção do sistema é a área CONGELADA de Gestão de Desempenho
 * (`avaliacao/entradaCards.tsx`), que fixa os seus números (20px / 0,4s /
 * 0,08s) localmente, porque aquele movimento foi aprovado e protegido por
 * `.clinerules` §1.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const cardVariants: Variants = entradaCardGlobal;

/**
 * Tom do ícone. Neutro por padrão (primary): vermelho fica reservado a risco e
 * âmbar a atenção — não há cor por card, como pede o design system.
 */
export type MetricTone = 'primary' | 'warning' | 'destructive' | 'muted' | 'info' | 'accent' | 'success';

const toneStyles: Record<MetricTone, string> = {
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
  info: 'bg-info/10 text-info',
  accent: 'bg-xp/10 text-xp',
  // `success` adicionado junto do redesign de Admissões (KPI "Finalizadas" usa o
  // verde semântico do sistema). É só mais um valor do union: nenhum call site
  // existente muda de aparência.
  success: 'bg-success/10 text-success',
};

interface MetricCardProps {
  title: string;
  value: string | number;
  rawValue?: number;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  description?: string;
  /** @deprecated Mantido por compatibilidade — o KPI usa `tone`. */
  gradient?: string;
  tone?: MetricTone;
  sparkline?: number[];
  index?: number;
  formatFn?: (n: number) => string;
  /** Destino ao clicar. Sem valor, cai no mapa por título; sem match, o card não navega. */
  route?: string;
  /** Texto explicativo do KPI, exibido num ícone `[i]` ao lado do título. */
  tooltip?: string;
  /** Classes extras no card (ex.: sombra/raio do contexto que o hospeda). */
  className?: string;
  /**
   * Área de Admissões: quando ESTE card pinta de vermelho — chip do tom
   * `destructive` (KPI "Canceladas") e selo de tendência negativa — usa a
   * variante VIBRANTE do token (`--destructive-vivid`, ver `src/index.css`) em
   * vez do `--destructive` do tema, que no dark (0 63% 35%) fica com ~2:1 de
   * contraste sobre o navy e o alerta some no fundo. Default `false`: nenhum
   * outro call site muda de aparência.
   */
  vividRed?: boolean;
  /**
   * Variante DENSE (faixa de KPI de 5 colunas, como o Dashboard Executivo): o
   * card mantém ícone, valor e padding no tamanho PADRÃO (mesma altura dos KPIs
   * do Dashboard Executivo) e apenas a LINHA DE APOIO fica um pouco menor (11px,
   * seta de 10px, gap menor) para caber em UMA linha — sem isso "vs. período
   * anterior" quebra em duas linhas e o card fica mais alto que a faixa
   * Executiva. Sem mudar textos, valores, cores, ordem ou comportamento.
   * Default `false`: nenhum outro call site muda de aparência. Usada hoje só
   * pela faixa de KPIs de Desligamentos (`DesligamentoKPIs`).
   */
  dense?: boolean;
  /**
   * Casas decimais PRESERVADAS na contagem do `AnimatedNumber` (padrão `0` =
   * inteiro, o comportamento histórico). Use `2` quando o KPI for MONETÁRIO
   * com centavos: sem isso a contagem arredondaria e o texto final divergiria
   * do valor real. Opcional e com default que preserva o comportamento atual,
   * então nenhum call site existente muda de aparência.
   */
  decimals?: number;
  /**
   * Quando `true`, o card NÃO executa a entrada própria: monta já no estado final
   * (`initial={false}`) e quem anima é o driver da página
   * (`components/dashboard/entradaDashboard.ts` → `useEntradaCascataDashboard`),
   * junto com TODOS os outros cards da tela, na ordem visual de leitura. Existe
   * para que o Dashboard Principal tenha UMA animação por card — sem duas
   * concorrendo pelo mesmo nó.
   *
   * Default `false`: os demais call sites usam a entrada padrão do sistema
   * (`cardVariants` = régua global: 14px / 0,52 s / 0,12 s).
   */
  entradaExterna?: boolean;
  /**
   * Quando `true`, o card entra pela RÉGUA GLOBAL de animação
   * (`components/ui/entradaGlobal.ts` → `CONFIG_ENTRADA_CARD_GLOBAL`: fade +
   * subida de 14px, 520 ms, 120 ms entre cards, ease-out, sem escala/spring),
   * informando a posição na fila em `indexForCascata`.
   *
   * Hoje é equivalente à entrada padrão (o `cardVariants` passou a SER a régua
   * global); a prop continua existindo porque as telas já a usam e porque
   * `indexForCascata` deixa a posição na fila explícita, sem depender do
   * `index` histórico de cada tela.
   *
   * Default `false`.
   */
  animarEntrada?: boolean;
  /**
   * Posição do card na FILA global de entrada (0 = primeiro). Só tem efeito com
   * `animarEntrada`. Sem valor, cai em `index` — que é o que as telas já
   * numeravam.
   */
  indexForCascata?: number;
  /**
   * Variante COMPACTA — faixa de KPI de tela OPERACIONAL (Central de Ajustes).
   *
   * O card padrão é o do Dashboard Executivo: ícone de 36 px, valor em
   * `text-data` (24 px) e linha de apoio, o que dá ~110–130 px de altura. Numa
   * tela de trabalho — onde a lista de solicitações começa logo abaixo — esse
   * volume empurra a tabela para fora da primeira dobra. A variante compacta
   * mantém a MESMA peça (ícone em chip semântico, título, valor, tooltip,
   * cascata de entrada e hover `card-interacao`) em 58–68 px:
   *
   *   [ícone 36]  Título        [ +20% ]
   *               Valor
   *
   * Três decisões fecham essa altura:
   *  · padding de 10 px (`px-2.5 py-2`) e `min-h-[62px]` — o piso da faixa;
   *  · selo de variação na MESMA linha do título (`ml-auto`), e não absoluto no
   *    canto — some a reserva de `pr-12` que encolhia o título;
   *  · a linha de apoio sai de cena e continua no DOM em `sr-only`, porque é o
   *    texto que explica o número para leitor de tela (a explicação do KPI
   *    segue no `[i]` → `tooltip`).
   *
   * Nada de dado muda: valor, descrição e variação são os mesmos, no mesmo
   * formato. Default `false`: nenhum call site existente muda de aparência.
   */
  compact?: boolean;
}

const defaultRoutes: Record<string, string> = {
  'Colaboradores Ativos': '/colaboradores',
  'Folha Mensal': '/folha',
  'Férias Pendentes': '/ferias',
  'Banco de Horas': '/ponto',
};

export function MetricCard({
  title,
  value,
  rawValue,
  icon: Icon,
  trend,
  description,
  tone = 'primary',
  sparkline,
  index = 0,
  formatFn,
  route,
  tooltip,
  className,
  vividRed = false,
  dense = false,
  decimals = 0,
  entradaExterna = false,
  animarEntrada = false,
  indexForCascata,
  compact = false,
}: MetricCardProps) {
  const isPositive = trend && trend.value >= 0;
  const target = route ?? defaultRoutes[title];
  /** Tinta vermelha do card (chip + tendência) — variante vibrante em Admissões. */
  const red = vividRed ? 'text-destructive-vivid' : 'text-destructive';
  const chipTone =
    tone === 'destructive' && vividRed ? 'bg-destructive-vivid/10 text-destructive-vivid' : toneStyles[tone];
  /** Régua de entrada: a GLOBAL (padrão) ou, por compatibilidade, a mesma. */
  const variantesEntrada = animarEntrada ? entradaCardGlobal : cardVariants;
  /** Posição na fila: explícita (`indexForCascata`) ou o `index` histórico. */
  const posicaoEntrada = indexForCascata ?? index;

  /**
   * VARIANTE COMPACTA — ver `compact` nas props.
   *
   * Retorno antecipado de propósito: o corpo do card padrão (linhas abaixo)
   * tem ~90 linhas de JSX validado por 70 telas e não deve ser reescrito para
   * hospedar uma condicional. O invólucro (`MotionCard` + entrada + hover +
   * clique) é IDÊNTICO nos dois caminhos — o que muda é só o conteúdo interno.
   */
  if (compact) {
    return (
      <MotionCard
        custom={posicaoEntrada}
        variants={variantesEntrada}
        initial={entradaExterna ? false : 'hidden'}
        animate="visible"
        className={cn(
          'group relative h-full min-h-[62px] overflow-hidden border border-border/60',
          CARD_INTERACAO,
          'rounded-xl',
          target && 'cursor-pointer',
          className
        )}
        onClick={() => {
          if (target) window.location.assign(target);
        }}
      >
        <CardContent className="relative flex h-full items-center gap-2 px-2.5 py-2">
          {/* Ícone no chip semântico do tom — bloco de 36 px (a faixa pede
              36–40 px) com raio de card pequeno, e não círculo: em 62 px de
              altura o círculo dava ao KPI cara de avatar de lista. */}
          <div
            className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-[10px]', CARD_INTERACAO_ICONE, chipTone)}
          >
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            {/* Título e selo na MESMA linha: o percentual fica no canto superior
                direito sem `absolute` e sem reserva de padding — não há como o
                título passar por baixo dele, ele apenas trunca. */}
            <div className="flex items-center gap-1">
              <p className="flex min-w-0 items-center gap-1 text-[10.5px] leading-tight tracking-wide text-muted-foreground normal-case">
                <span className="truncate">{title}</span>
                {tooltip && (
                  <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <InfoTooltip content={tooltip} />
                  </span>
                )}
              </p>
              {trend && (
                <span
                  className={cn(
                    'ml-auto inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[9.5px] font-semibold tabular-nums',
                    isPositive ? 'bg-success/15 text-success' : `bg-destructive/15 ${red}`
                  )}
                >
                  {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                  {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {/* Valor em destaque (21 px) em UMA linha: `leading-none` mantém a
                faixa em 62 px mesmo com o selo ao lado do título. */}
            <div className="mt-0.5 text-[21px] leading-none font-semibold tracking-tight text-foreground tabular-nums">
              {rawValue !== undefined ? (
                <AnimatedNumber
                  value={rawValue}
                  decimals={decimals}
                  format={
                    formatFn ||
                    (typeof value === 'string' && value.includes('R$') ? (n) => formatCurrency(n) : undefined)
                  }
                />
              ) : (
                value
              )}
            </div>
            {/* Linha de apoio: NÃO é desenhada no compacto (a referência mostra
                só título + valor + variação). O texto continua no DOM em
                `sr-only` — é ele que explica o número para leitor de tela — e o
                `[i]` ao lado do título segue com a explicação do KPI. */}
            {description && <span className="sr-only">{description}</span>}
          </div>
        </CardContent>
      </MotionCard>
    );
  }

  return (
    <MotionCard
      custom={posicaoEntrada}
      variants={variantesEntrada}
      initial={entradaExterna ? false : 'hidden'}
      animate="visible"
      className={cn(
        'group relative h-full overflow-hidden border border-border/60',
        CARD_INTERACAO,
        'rounded-xl',
        target && 'cursor-pointer',
        className
      )}
      onClick={() => {
        if (target) window.location.assign(target);
      }}
    >
      <CardContent className="relative flex h-full items-center gap-2.5 p-3">
        <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', CARD_INTERACAO_ICONE, chipTone)}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          {/* `normal-case tracking-normal`: a referência usa o título em caixa
              de frase, não versalete — e a versão maiúscula+tracking largo
              cortava títulos como "Colaboradores Ativos" antes do fim. */}
          <p className="flex items-center gap-1 text-xs font-normal tracking-wide leading-snug text-muted-foreground normal-case truncate">
            <span className="truncate">{title}</span>
            {tooltip && (
              <span onClick={(e) => e.stopPropagation()}>
                <InfoTooltip content={tooltip} />
              </span>
            )}
          </p>
          <div className={cn('text-data truncate', dense ? 'mt-1' : 'mt-1.5')}>
            {rawValue !== undefined ? (
              <AnimatedNumber
                value={rawValue}
                decimals={decimals}
                format={
                  formatFn || (typeof value === 'string' && value.includes('R$') ? (n) => formatCurrency(n) : undefined)
                }
              />
            ) : (
              value
            )}
          </div>
          {(description || trend) && (
            // Linha de apoio: indicador (percentual/status) imediatamente à
            // esquerda do texto, tudo alinhado à esquerda (`text-left`).
            // `flex-wrap` + ausência de `truncate`: a frase aparece INTEIRA —
            // quebra para a linha seguinte se a largura não bastar, em vez de
            // virar reticências cortando o sentido ("processos encerrados no
            // período" → "processos encerr…").
            <div
              className={cn(
                'flex min-w-0 flex-wrap items-center gap-y-0.5 text-left mt-1',
                dense ? 'gap-x-1' : 'gap-x-1.5'
              )}
            >
              {trend && (
                // Sem `cn()`: combinada com `text-success`/`text-destructive` na
                // mesma chamada, o tailwind-merge derrubava `text-overline` e o
                // selo de tendência renderizava no tamanho padrão do navegador
                // (16px) em vez do token de 10px.
                // Modo DENSE (faixa 5-up): selo menor (10px, seta 10px) para a
                // linha de apoio caber em UMA linha ("150% vs. período
                // anterior") na largura de ~146px do card — em 11/12px a frase
                // quebra em duas linhas e o card fica mais alto que os KPIs do
                // Dashboard Executivo (que também usam uma linha de apoio pequena).
                <span
                  className={`inline-flex items-center ${dense ? 'gap-0 text-[10px]' : 'gap-0.5 text-xs'} font-medium tracking-normal leading-snug shrink-0 ${isPositive ? 'text-success' : red}`}
                >
                  {isPositive ? (
                    <ArrowUpRight className={dense ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                  ) : (
                    <ArrowDownRight className={dense ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                  )}
                  {Math.abs(trend.value)}%
                </span>
              )}
              {/* `text-pretty` (text-wrap: pretty): quando a frase precisa de duas
                  linhas, evita a última palavra órfã ("processos encerrados no /
                  período" → "processos encerrados / no período"). Não altera
                  fonte nem tamanho; em navegador sem suporte o texto apenas
                  segue o quebra-linha padrão. */}
              <span
                className={cn(
                  'text-pretty font-normal tracking-wide leading-snug text-muted-foreground normal-case',
                  dense ? 'text-[10px]' : 'text-xs'
                )}
              >
                {description || trend?.label}
              </span>
            </div>
          )}
        </div>

        {sparkline && sparkline.length > 0 && (
          <MiniSparkline data={sparkline} className="opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </CardContent>
    </MotionCard>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
