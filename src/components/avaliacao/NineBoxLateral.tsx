import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  History,
  Info,
  Lightbulb,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { iniciais } from './desempenhoComum';
import { entradaCard } from './entradaCards';
import {
  PELE_QUADRANTE,
  QUADRANTE_POR_CHAVE,
  type InsightEstruturado,
  type PontoNineBox,
  type TipoInsight,
} from './nineBoxComum';

/**
 * ============================================================================
 * COLUNA LATERAL — os dois widgets estratégicos do Nine-Box.
 *
 *   1. TALENTOS EM DESTAQUE — ranking real (soma das duas notas) com as notas
 *      de desempenho e potencial de cada pessoa e o quadrante em que ela caiu.
 *      "Ver todos" expande/recolhe a MESMA lista (nenhuma navegação fictícia);
 *   2. INSIGHTS — o card de RECOMENDAÇÕES: peso visual maior (gradiente âmbar
 *      translúcido + glow discreto), cabeçalho com ícone em caixa e subtítulo,
 *      lista com números/palavras-chave em destaque, o item mais grave num
 *      bloco de prioridade e o destaque do recorte em bloco próprio no rodapé.
 *      O botão "Gerar relatório" da referência NÃO existe porque o sistema não
 *      gera relatório desta aba: botão sem ação não é criado.
 *
 * O card "MOVIMENTAÇÕES NO CICLO" foi REMOVIDO: ele repetia, num gráfico
 * próprio, os mesmos números que os quatro KPI Cards do topo já mostram
 * (avaliados / evoluíram / permaneceram / regrediram). O controle do
 * comparativo com o ciclo anterior continua existindo UMA vez, no botão
 * "Comparar ciclos" da barra de filtros — nenhuma funcionalidade foi perdida.
 *
 * Cada widget é uma superfície própria (`rounded-xl` + borda discreta) e entra na
 * mesma cascata dos KPI Cards, na sequência de leitura. A coluna ESTICA até a
 * altura da matriz (`self-stretch` no wrapper) e os dois cards CRESCEM (`grow`)
 * para fechá-la: as listas usam `justify-between`, então o espaço extra vira
 * respiro entre as linhas (nunca um bloco vazio nem um card inflado), e as bases
 * esquerda/direita ficam na MESMA linha.
 * ============================================================================
 */

interface NineBoxLateralProps {
  indice?: number;
  /** Ranking completo (ordem do maior somatório para o menor). */
  ranking: PontoNineBox[];
  /** Insights já estruturados, do mais grave para o menos (`lerInsightsEstruturados`). */
  insights: InsightEstruturado[];
}

/** Ícone e caixa de cada tipo de insight — mesmos tons dos KPIs e do banner. */
const TIPO_INSIGHT: Record<TipoInsight, { Icone: LucideIcon; caixa: string }> = {
  risco: { Icone: AlertTriangle, caixa: 'bg-destructive-vivid/15 text-destructive-vivid' },
  pdi: { Icone: BookOpen, caixa: 'bg-info/15 text-info' },
  potencial: { Icone: Info, caixa: 'bg-muted/50 text-muted-foreground' },
  oportunidade: { Icone: Users, caixa: 'bg-primary/15 text-primary' },
  historico: { Icone: History, caixa: 'bg-info/10 text-info' },
};

/** Encadeamento da lista de insights (item a item, do topo para baixo). */
const LISTA_INSIGHTS = {
  fechado: {},
  aberto: { transition: { staggerChildren: 0.07, delayChildren: 0.06 } },
};

/** Movimento de cada item: fade + subida curta (metade do `entradaCard`). */
function itemInsight(reduzirMovimento: boolean) {
  return {
    fechado: { opacity: 0, y: reduzirMovimento ? 0 : 4 },
    aberto: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' as const } },
  };
}

export function NineBoxLateral({ indice = 12, ranking, insights }: NineBoxLateralProps) {
  const [verTodos, setVerTodos] = useState(false);
  const lista = verTodos ? ranking : ranking.slice(0, 3);
  const reduzirMovimento = useMovimentoReduzido();

  return (
    <div className="flex min-w-0 flex-col gap-1.5 self-stretch">
      {/* 1 · Talentos em destaque */}
      <motion.div
        {...entradaCard(indice)}
        className="flex grow flex-col rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/60 p-2.5 shadow-elevated"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Talentos em destaque
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVerTodos((v) => !v)}
            disabled={ranking.length <= 3}
            className="h-7 shrink-0 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            {verTodos ? 'Ver menos' : 'Ver todos'}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>

        {lista.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">Nenhum colaborador classificado neste recorte.</p>
        ) : (
          /* `@container`: a reorganização é decidida pela LARGURA DO PRÓPRIO CARD
             (mais fiel que os breakpoints de viewport — a coluna lateral só é
             estreita no `xl`, onde ela ocupa ~28% da grade). */
          <ul className="@container flex flex-1 flex-col justify-between gap-1">
            {lista.map((p) => {
              const pele = p.quadrante ? PELE_QUADRANTE[p.quadrante] : null;
              return (
                /* Card largo (≥ 320px): 4 blocos em linha — avatar · nome+cargo ·
                   badge · métricas. Estreito: nome com o badge logo abaixo (2ª
                   linha) e as métricas numa coluna própria à direita. */
                <li
                  key={p.id}
                  className={cn(
                    'grid min-w-0 items-center gap-x-3 gap-y-0.5 rounded-lg px-1 py-0.5',
                    '[grid-template-columns:auto_minmax(0,1fr)_auto]',
                    "[grid-template-areas:'avatar_nome_metricas'_'avatar_badge_metricas']",
                    '@min-[320px]:[grid-template-columns:auto_minmax(0,1fr)_auto_auto]',
                    "@min-[320px]:[grid-template-areas:'avatar_nome_badge_metricas'] @min-[320px]:gap-y-0"
                  )}
                >
                  {/* 1 · Avatar */}
                  <span className="[grid-area:avatar] h-9 w-9 overflow-hidden rounded-full ring-1 ring-inset ring-border/60">
                    {p.foto ? (
                      <img src={p.foto} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-muted/60 text-[10px] font-semibold text-muted-foreground">
                        {iniciais(p.nome)}
                      </span>
                    )}
                  </span>

                  {/* 2 · Identificação — nome e, logo abaixo, cargo · departamento. */}
                  <div className="[grid-area:nome] min-w-0">
                    <p className="truncate text-[12px] font-semibold leading-tight text-foreground">{p.nome}</p>
                    <p className="truncate text-[10px] leading-tight text-muted-foreground">
                      {[p.cargo, p.departamento].filter(Boolean).join(' · ') || 'Sem cargo e departamento cadastrados'}
                    </p>
                  </div>

                  {/* 3 · Badge da classificação — logo após a identificação. */}
                  {p.quadrante && pele && (
                    <span
                      className={cn(
                        '[grid-area:badge] max-w-full justify-self-start truncate rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                        pele.tinta,
                        pele.borda
                      )}
                    >
                      {QUADRANTE_POR_CHAVE[p.quadrante].nome}
                    </span>
                  )}

                  {/* 4 · Métricas — rótulo à esquerda, valor em coluna própria à direita. */}
                  <div className="[grid-area:metricas] grid shrink-0 grid-cols-[auto_1.5rem] items-center gap-x-3 gap-y-0.5 text-[10px] leading-tight">
                    <span className="text-muted-foreground">Desempenho</span>
                    <span className="text-right font-semibold tabular-nums text-foreground">{p.nota ?? '—'}</span>
                    <span className="text-muted-foreground">Potencial</span>
                    <span className="text-right font-semibold tabular-nums text-foreground">{p.potencial ?? '—'}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>

      {/* 2 · Insights — card de recomendações. O card "Movimentações no ciclo"
          foi REMOVIDO (redundante): os mesmos números vivem nos quatro KPIs. */}
      <motion.div
        {...entradaCard(indice + 1)}
        className="relative flex grow flex-col overflow-hidden rounded-xl border border-warning/30 bg-gradient-to-b from-warning/[0.09] via-card to-card p-2.5 shadow-[0_0_28px_-18px_hsl(var(--warning))] transition-colors hover:border-warning/50"
      >
        {/* Brilho decorativo do canto: só composição (o card continua sendo o card). */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-warning/10 blur-2xl"
        />

        {/* Cabeçalho: ícone em caixa (padrão dos KPIs) + título + subtítulo. */}
        <div className="relative mb-2 flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning ring-1 ring-inset ring-warning/25">
            <Lightbulb className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[12px] font-semibold uppercase leading-tight tracking-wider text-foreground">
              Insights
            </p>
            <p className="text-[10px] leading-tight text-muted-foreground">Recomendações para este ciclo</p>
          </div>
        </div>

        {/* Lista: entra em cascata e o PRIMEIRO item (o mais grave) ganha bloco de
            prioridade — a ordem de `lerInsightsEstruturados` É a prioridade. */}
        <motion.ul
          variants={LISTA_INSIGHTS}
          initial="fechado"
          animate="aberto"
          className="relative flex flex-1 flex-col justify-between gap-1"
        >
          {insights.map((insight, i) => {
            const { Icone, caixa } = TIPO_INSIGHT[insight.tipo];
            const principal = i === 0;
            return (
              <motion.li
                key={insight.id}
                variants={itemInsight(reduzirMovimento)}
                className={cn(
                  // Hover INDIVIDUAL: só o item sob o mouse escurece (token de
                  // superfície mais escura do tema = `--background`), 220ms e
                  // cobrindo a área inteira do item (mesmo `rounded-lg`).
                  'flex items-start gap-2 rounded-lg border px-2.5 py-1 transition-colors duration-[220ms]',
                  principal
                    ? 'border-warning/30 bg-warning/[0.08] hover:bg-background/80'
                    : 'border-transparent hover:border-border/50 hover:bg-background/80'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md',
                    principal ? 'bg-warning/20 text-warning' : caixa
                  )}
                >
                  <Icone className="h-3 w-3" />
                </span>
                <p className="min-w-0 flex-1 text-[11px] leading-tight text-muted-foreground">
                  {principal && (
                    <span className="mr-1 rounded border border-warning/40 bg-warning/15 px-1 py-px align-middle text-[9px] font-semibold uppercase tracking-wide text-warning">
                      Prioridade
                    </span>
                  )}
                  {insight.trechos.map((trecho, j) =>
                    trecho.forte ? (
                      <strong
                        key={j}
                        className={cn('font-semibold', principal ? 'text-foreground' : 'text-foreground/90')}
                      >
                        {trecho.texto}
                      </strong>
                    ) : (
                      <span key={j}>{trecho.texto}</span>
                    )
                  )}
                </p>
              </motion.li>
            );
          })}
        </motion.ul>
        {/* Rodapé: destaque do recorte em bloco próprio (avatar + nome + quadrante). */}
        {ranking.length > 0 && (
          <div className="relative mt-2 flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 p-1.5 transition-colors duration-[220ms] hover:bg-background/80">
            <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-inset ring-warning/25">
              {ranking[0].foto ? (
                <img src={ranking[0].foto} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-muted/60 text-[10px] font-semibold text-muted-foreground">
                  {iniciais(ranking[0].nome)}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/80">
                <Award className="h-3 w-3 shrink-0 text-warning" />
                Destaque do recorte
              </p>
              <p className="truncate text-[12px] font-semibold leading-tight text-foreground">{ranking[0].nome}</p>
            </div>
            {ranking[0].quadrante && (
              <span
                className={cn(
                  'shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                  PELE_QUADRANTE[ranking[0].quadrante].tinta,
                  PELE_QUADRANTE[ranking[0].quadrante].borda
                )}
              >
                {QUADRANTE_POR_CHAVE[ranking[0].quadrante].nome}
              </span>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
