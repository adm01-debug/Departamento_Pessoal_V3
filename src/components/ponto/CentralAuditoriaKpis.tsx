/**
 * ============================================================================
 * KPIs DA CENTRAL DE AUDITORIA — quatro indicadores na mesma linha do topo.
 *
 * ── POR QUE UM CARD PRÓPRIO (e não o `MetricCard` do Dashboard) ────────────
 * O `MetricCard` é a peça oficial de KPI do sistema e continua sendo a régua de
 * tipografia, do chip de ícone e da cascata de entrada — este card REPETE
 * exatamente esses valores (chip 36 px `rounded-xl` com a tinta do tom, título
 * de 11 px em `text-muted-foreground`, valor em `text-numeric`, entrada
 * `entradaCard(i)` e hover `CARD_INTERACAO`). A única diferença é a POSIÇÃO do
 * selo de variação: a referência aprovada desta tela o coloca na região
 * superior direita do card, acima do número; no `MetricCard` ele vive na linha
 * de apoio, abaixo do valor. Mover o selo lá dentro mudaria os ~70 call sites
 * do Dashboard — por isso a composição foi refeita aqui e só aqui.
 *
 * ── DE ONDE VÊM OS NÚMEROS ─────────────────────────────────────────────────
 * `resumo` e `variacoes` chegam prontos do componente pai, calculados por
 * `resumoAuditoria`/`variacoesAuditoria` sobre a MESMA lista que a timeline
 * mostra (recortada pelo período). Nada é contado aqui.
 *
 * ── SELO DE VARIAÇÃO ───────────────────────────────────────────────────────
 * Com variação `null` (sem base de comparação) o selo NÃO aparece. Zero vira um
 * selo neutro "0%". Em "Eventos de atenção" a leitura é INVERTIDA: cair é bom —
 * o selo fica verde quando o número diminui.
 *
 * ── O SELO QUANDO O CARD É ESTREITO ────────────────────────────────────────
 * Na Central de Auditoria estes quatro cards vivem na coluna de ~69% — cada um
 * com ~1/4 dela —, e o selo (que é `shrink-0`) não cabe ao lado do título sem
 * espremê-lo a zero. A linha do título+selo por isso QUEBRA: o título usa até
 * duas linhas (`line-clamp-2`) e o selo desce para a linha de baixo, sempre
 * alinhado à direita (`ml-auto`). É o mesmo selo, na mesma região do card —
 * nenhuma cor, ícone ou número muda.
 * ============================================================================
 */
import { ArrowDownRight, ArrowUpRight, Layers, PencilLine, Plus, TriangleAlert, type LucideIcon } from 'lucide-react';
import { MotionCard, entradaCard } from '@/components/ui/entrada-cards';
import { CARD_INTERACAO, CARD_INTERACAO_ICONE } from '@/components/ui/interacao-cards';
import { cn } from '@/lib/utils';
import type { ResumoAuditoria, VariacoesAuditoria } from './centralAuditoria';

interface CentralAuditoriaKpisProps {
  resumo: ResumoAuditoria;
  variacoes: VariacoesAuditoria;
}

/** Tinta do chip — os MESMOS pares que o `MetricCard` usa por tom. */
const TINTA_CHIP = {
  accent: 'bg-xp/10 text-xp',
  success: 'bg-success/10 text-success',
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
} as const;

interface CartaoKpi {
  chave: keyof VariacoesAuditoria;
  titulo: string;
  valor: number;
  icone: LucideIcon;
  tom: keyof typeof TINTA_CHIP;
  /** Neste card, CAIR é bom (eventos de atenção). */
  inverter?: boolean;
}

export function CentralAuditoriaKpis({ resumo, variacoes }: CentralAuditoriaKpisProps) {
  const cartoes: CartaoKpi[] = [
    { chave: 'total', titulo: 'Total de eventos', valor: resumo.total, icone: Layers, tom: 'accent' },
    { chave: 'criados', titulo: 'Registros criados', valor: resumo.criados, icone: Plus, tom: 'success' },
    { chave: 'alterados', titulo: 'Registros alterados', valor: resumo.alterados, icone: PencilLine, tom: 'info' },
    {
      chave: 'atencao',
      titulo: 'Eventos de atenção',
      valor: resumo.atencao,
      icone: TriangleAlert,
      tom: 'warning',
      inverter: true,
    },
  ];

  return (
    /* Duas colunas no mobile estreito, quatro a partir de `lg` — a mesma altura
       em toda a linha porque o `MotionCard` é `h-full`. */
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {cartoes.map(({ chave, titulo, valor, icone: Icone, tom, inverter }, indice) => (
        <MotionCard
          key={chave}
          {...entradaCard(indice)}
          className={cn('flex h-full items-center gap-2.5 rounded-xl border border-border/60 p-3', CARD_INTERACAO)}
        >
          <span
            className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', CARD_INTERACAO_ICONE, TINTA_CHIP[tom])}
          >
            <Icone className="h-[17px] w-[17px]" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            {/* Título + selo numa linha que PODE quebrar: na coluna de ~69% o
                card fica com ~1/4 da largura e, se o selo (`shrink-0`) não
                couber ao lado do título, ele desce para a linha de baixo em vez
                de espremer o título a zero. `ml-auto` mantém o selo no canto
                direito nos dois casos, e `line-clamp-2` evita que o título vire
                uma coluna de uma palavra. */}
            <div className="flex flex-wrap items-start gap-x-1 gap-y-0.5">
              <p className="line-clamp-2 min-w-0 text-[11px] leading-tight font-medium text-muted-foreground">
                {titulo}
              </p>
              <SeloVariacao variacao={variacoes[chave]} inverter={inverter} />
            </div>
            <p className="text-numeric mt-1 text-[22px] leading-none font-semibold">{valor}</p>
          </div>
        </MotionCard>
      ))}
    </div>
  );
}

/**
 * Selo de variação do canto — sem base de comparação (`null`) não existe selo;
 * zero é neutro; o resto é verde/vermelho conforme a leitura do card.
 */
function SeloVariacao({ variacao, inverter }: { variacao: number | null; inverter?: boolean }) {
  if (variacao === null) return null;

  const neutro = variacao === 0;
  const bom = inverter ? variacao < 0 : variacao > 0;
  const Seta = variacao >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        'ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-[1px] text-[10px] leading-none font-semibold tabular-nums',
        neutro
          ? 'border-border/60 bg-muted/40 text-muted-foreground'
          : bom
            ? 'border-success/30 bg-success/10 text-success'
            : 'border-destructive/30 bg-destructive/10 text-destructive-vivid'
      )}
      title={`${variacao > 0 ? '+' : ''}${variacao}% em relação ao período anterior`}
    >
      <Seta className="h-2.5 w-2.5" aria-hidden="true" />
      {Math.abs(variacao)}%
    </span>
  );
}
