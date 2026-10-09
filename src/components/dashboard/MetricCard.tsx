import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';
import { MiniSparkline } from './MiniSparkline';
import { InfoTooltip } from '@/components/ui/info-tooltip';

const MotionCard = motion.create(Card);

// eslint-disable-next-line react-refresh/only-export-components
export const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

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
}: MetricCardProps) {
  const isPositive = trend && trend.value >= 0;
  const target = route ?? defaultRoutes[title];
  /** Tinta vermelha do card (chip + tendência) — variante vibrante em Admissões. */
  const red = vividRed ? 'text-destructive-vivid' : 'text-destructive';
  const chipTone =
    tone === 'destructive' && vividRed ? 'bg-destructive-vivid/10 text-destructive-vivid' : toneStyles[tone];

  return (
    <MotionCard
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'group relative h-full overflow-hidden border border-border/60 hover:border-primary/40',
        'transition-all duration-500 rounded-xl',
        target && 'cursor-pointer',
        className
      )}
      onClick={() => {
        if (target) window.location.assign(target);
      }}
    >
      <CardContent className="relative flex h-full items-center gap-2.5 p-3">
        <div
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:scale-105',
            chipTone
          )}
        >
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
