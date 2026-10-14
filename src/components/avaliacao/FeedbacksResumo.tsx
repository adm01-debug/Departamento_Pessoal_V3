import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Lightbulb, Minus, Plus, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarraProgresso } from './barraProgresso';
import { entradaCard, MotionCard } from './entradaCards';
import {
  ROTULO_TIPO_FEEDBACK,
  formatarNota,
  type LinhaDistribuicao,
  type LinhaTipo,
} from './feedbacksComum';

/**
 * ============================================================================
 * RESUMO LATERAL — coluna direita da aba "Feedbacks".
 *
 * Três cards, todos sobre dado real:
 *   1. DISTRIBUIÇÃO DE NOTAS — barras de 5 a 1 (na MESMA animação e no mesmo
 *      degradê semântico do módulo, via `BarraProgresso`), com o total por
 *      faixa e o rodapé de nota média (e a diferença para o ciclo anterior —
 *      só quando os dois ciclos têm nota, nada de delta inventado);
 *   2. TIPOS DE FEEDBACK — donut SVG com o total no centro e legenda lateral
 *      com quantidade e percentual de cada tipo presente nos dados;
 *   3. DICA — texto curto de orientação + o CTA real "Novo Feedback".
 *
 * GEOMETRIA E ANIMAÇÃO: os três cards entram na cascata do módulo
 * (`entradaCard`) e as barras/segmentos animam na régua aprovada
 * (`barraProgressoAnim` / draw do donut).
 * ============================================================================
 */

/** Casco dos cards laterais: título + conteúdo, mesma pele dos cards do módulo. */
function CardResumo({
  icone,
  titulo,
  indice,
  children,
}: {
  icone: React.ReactNode;
  titulo: string;
  indice: number;
  children: React.ReactNode;
}) {
  return (
    <MotionCard {...entradaCard(indice)} className="rounded-xl border-border/60 bg-gradient-to-b from-card to-card/60 p-4 shadow-elevated">
      <h3 className="flex items-center gap-2 font-display text-[12px] font-semibold tracking-tight">
        <span className="text-muted-foreground">{icone}</span>
        {titulo}
      </h3>
      <div className="mt-3">{children}</div>
    </MotionCard>
  );
}

/**
 * Donut dos tipos: um arco por tipo presente, com o total no centro. Usa o
 * MESMO desenho de anel do módulo (`stroke-dasharray` sobre um `circle`, como
 * `ProgressoDonut`) e a cor do sistema de cada tipo. Os segmentos são extraídos
 * por `draw` (o `stroke-dasharray` cresce de 0 até a fatia) com atraso em
 * cascata; com movimento reduzido o desenho já nasce completo.
 */
function DonutTipos({
  tipos,
  total,
  reduzirMovimento = false,
}: {
  tipos: LinhaTipo[];
  total: number;
  reduzirMovimento?: boolean;
}) {
  const TAM = 112;
  const R = 42;
  const ESP = 14;
  const P = 2 * Math.PI * R;
  let acumulado = 0;

  return (
    <div className="relative h-[112px] w-[112px] shrink-0">
      <svg viewBox={`0 0 ${TAM} ${TAM}`} className="h-[112px] w-[112px]" aria-hidden="true">
        {/* Trilho neutro enquanto não há dado. */}
        <circle cx={TAM / 2} cy={TAM / 2} r={R} fill="none" strokeWidth={ESP} className="stroke-muted/40" />
        {total > 0 &&
          tipos.map((linha, i) => {
            const fatia = P * (linha.quantidade / total);
            const inicio = acumulado;
            acumulado += fatia;
            // Dash = fatia visível + o RESTO do perímetro como vão. O vão nunca
            // pode ser 0: um padrão "len 0" repete a fatia ao longo do círculo
            // inteiro e o segmento cobriria todos os anteriores.
            const dash = `${fatia} ${P - fatia}`;
            return (
              <motion.circle
                key={linha.tipo}
                cx={TAM / 2}
                cy={TAM / 2}
                r={R}
                fill="none"
                strokeWidth={ESP}
                strokeLinecap="butt"
                strokeDashoffset={-inicio}
                transform={`rotate(-90 ${TAM / 2} ${TAM / 2})`}
                initial={reduzirMovimento ? false : { strokeDasharray: `0 ${P}` }}
                animate={{ strokeDasharray: dash }}
                transition={{ duration: 0.7, delay: 0.15 + i * 0.12, ease: 'easeOut' }}
                // A cor entra por `style` (propriedade CSS): `var()` NÃO é
                // resolvido em atributo de apresentação, então `stroke={...}`
                // deixaria o arco sem cor.
                style={{ stroke: linha.traco, ...(reduzirMovimento ? { strokeDasharray: dash } : {}) }}
              />
            );
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-semibold leading-none tabular-nums">{total}</span>
        <span className="mt-1 text-[9px] leading-none text-muted-foreground">
          {total === 1 ? 'feedback' : 'feedbacks'}
        </span>
      </div>
    </div>
  );
}

interface FeedbacksResumoProps {
  /** Distribuição das notas (5 → 1), já derivada. */
  distribuicao: LinhaDistribuicao[];
  /** Nota média do ciclo (0–5) ou `null`. */
  media: number | null;
  /** Diferença para o ciclo anterior (pontos de nota) ou `null`. */
  delta: number | null;
  /** Tipos realmente presentes, já derivados. */
  tipos: LinhaTipo[];
  /** Total de feedbacks do ciclo (centro do donut). */
  total: number;
  /** Posição da coluna na cascata (o banner e os filtros vêm antes). */
  indiceBase?: number;
  reduzirMovimento?: boolean;
  /** Ação real: abre o dialog de novo feedback. */
  onNovoFeedback?: () => void;
}

export function FeedbacksResumo({
  distribuicao,
  media,
  delta,
  tipos,
  total,
  indiceBase = 2,
  reduzirMovimento = false,
  onNovoFeedback,
}: FeedbacksResumoProps) {
  const tomDelta = delta === null ? 'neutra' : delta > 0 ? 'alta' : delta < 0 ? 'baixa' : 'neutra';
  const APARENCIA_DELTA = {
    alta: { Icone: TrendingUp, tinta: 'text-success' },
    baixa: { Icone: TrendingDown, tinta: 'text-destructive-vivid' },
    neutra: { Icone: Minus, tinta: 'text-muted-foreground' },
  } as const;
  const { Icone: IconeDelta, tinta: tintaDelta } = APARENCIA_DELTA[tomDelta];

  return (
    <div className="space-y-4">
      {/* ── 1. Distribuição de notas ─────────────────────────────────────── */}
      <CardResumo icone={<Star className="h-3.5 w-3.5" />} titulo="Distribuição de notas" indice={indiceBase}>
        <div className="space-y-1.5">
          {distribuicao.map((faixa, i) => (
            <div key={faixa.nota} className="flex items-center gap-2">
              <span className="flex w-8 shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                <Star className="h-3 w-3 shrink-0 fill-current text-warning" />
                {faixa.nota}
              </span>
              <BarraProgresso
                percentual={faixa.percentual}
                indice={i}
                cor={faixa.barra}
                reduzirMovimento={reduzirMovimento}
                trilhoClassName="h-2 flex-1 bg-muted/50"
              />
              <span className="w-6 shrink-0 text-right text-[11px] font-medium tabular-nums">{faixa.quantidade}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3 border-t border-border/30 pt-2.5">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nota média</p>
            <p className="font-display text-xl font-semibold leading-none tabular-nums">
              {media === null ? '—' : formatarNota(media)}
            </p>
          </div>
          {delta !== null && (
            <div className="text-right">
              <p className={cn('flex items-center justify-end gap-1 text-[12px] font-semibold tabular-nums', tintaDelta)}>
                <IconeDelta className="h-3.5 w-3.5 shrink-0" />
                {delta > 0 ? '+' : ''}
                {formatarNota(delta)}
              </p>
              <p className="text-[10px] leading-tight text-muted-foreground">vs. ciclo anterior</p>
            </div>
          )}
        </div>
      </CardResumo>

      {/* ── 2. Tipos de feedback ─────────────────────────────────────────── */}
      <CardResumo icone={<Star className="h-3.5 w-3.5" />} titulo="Tipos de feedback" indice={indiceBase + 1}>
        <div className="flex items-center gap-3">
          <DonutTipos tipos={tipos} total={total} reduzirMovimento={reduzirMovimento} />

          <ul className="min-w-0 flex-1 space-y-1.5">
            {tipos.length === 0 && <li className="text-[11px] text-muted-foreground">Nenhum feedback no ciclo.</li>}
            {tipos.map((linha) => (
              <li key={linha.tipo} className="flex min-w-0 items-center gap-1.5 text-[10px] leading-tight">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', linha.cor)} />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {ROTULO_TIPO_FEEDBACK[linha.tipo]}
                </span>
                <span className="shrink-0 font-medium tabular-nums">{linha.quantidade}</span>
                <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                  {linha.percentual}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardResumo>

      {/* ── 3. Dica + CTA real ───────────────────────────────────────────── */}
      <MotionCard
        {...entradaCard(indiceBase + 2)}
        className="rounded-xl border-primary/25 bg-primary/5 p-4 shadow-elevated"
      >
        <h3 className="flex items-center gap-2 font-display text-[12px] font-semibold tracking-tight">
          <span className="text-primary">
            <Lightbulb className="h-3.5 w-3.5" />
          </span>
          Dica
        </h3>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Feedbacks construtivos geram desenvolvimento real. Descreva a situação, o comportamento observado e o
          impacto — e reconheça o progresso antes de apontar o próximo passo.
        </p>
        <Button
          size="sm"
          className="mt-3 h-8 w-full gap-1.5 rounded-lg text-[11px] font-medium"
          onClick={onNovoFeedback}
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Feedback
        </Button>
      </MotionCard>
    </div>
  );
}
