/**
 * ============================================================================
 * PESQUISAS DE CLIMA & eNPS — INDICADOR DA FAIXA DE MÉTRICAS.
 *
 * Anatomia herdada dos KPI Cards do Dashboard Executivo (a referência):
 * `<CardContent className="flex h-full items-center gap-2.5 p-3">` + ícone
 * `h-9 w-9 rounded-full` (`h-4 w-4` dentro). O card aqui é um GRID de duas
 * linhas e três colunas, porque a variação não mora mais embaixo do número:
 *
 *   coluna 1 (linhas 1–2) · ícone — `row-span-2`, centralizado no card inteiro
 *                            (é o `items-center` de antes, agora por grid);
 *   coluna 2 (linha 1)     · título → `text-xs font-normal leading-snug tracking-wide`
 *   coluna 2 (linha 2)     · valor  → `text-2xl font-display font-semibold leading-none`
 *   coluna 3 (linha 2)     · variação → pílula verde, no EXTREMO DIREITO do card
 *
 * O respiro entre título e número saiu do `mt-1.5` e virou `gap-y-1.5` do grid
 * (mesmo 0,375rem): a distância óptica é idêntica, mas a LINHA 2 passa a medir
 * exatamente a altura do número — e é por isso que a pílula, colocada nessa
 * linha, fica centrada no número e não no card (alinha sozinha, pelo
 * `items-center` do grid, sem `self-start`/`translate-y`). Se a variação
 * voltasse a ser uma terceira linha de texto, o alinhamento dependeria de
 * números mágicos; com duas linhas, o próprio grid resolve.
 *
 * A pílula também é o único ponto em que este card se afasta do Dashboard (lá a
 * variação continua sob o valor): mesma tinta `text-success` e mesmo glifo
 * `TrendingUp` de sempre — o que mudou foi posição, escala (`text-[10px]`, que a
 * régua px→rem do PostCSS renderiza a 12,5px) e o respiro interno (`px-1.5
 * py-0.5`). Nenhuma cor de fundo foi acrescentada: a pílula continua sem
 * preenchimento e sem borda, como a tela aprovou.
 *
 * POR QUE ESTE ARQUIVO NÃO TEM `min-height` NEM PADDING PRÓPRIO: a altura do
 * card NÃO é fixada em px — ela é a SOMA dos internos (30 de padding + 20,6 do
 * título + 7,5 do respiro + 30 do valor + 2 de borda ≈ 90px, medidos no
 * Chromium com o CSS compilado). Como a variação passou a dividir a linha do
 * número, o card fica ~22px mais baixo que a versão de três níveis (112px) —
 * quem garante a linha uniforme na grade é o `h-full`, não um `min-h-[…]`.
 *
 * O que NÃO vem do Dashboard (de propósito): as TINTAS. O quadrado do ícone usa
 * `caixa` (token semântico da métrica, vindo da página), a variação continua em
 * `text-success`, e borda/fundo em gradiente são os que a tela já aprovou.
 *
 * `font-display` é Plus Jakarta Sans — a MESMA família de `font-sans` no
 * `tailwind.config.js`; entra aqui só para o valor carregar a mesma declaração
 * do Dashboard, sem trocar a tipografia da tela.
 *
 * A variação é um texto JÁ FORMATADO ("+25%", "+12 p.p.") — o componente não
 * sabe de onde ela vem: quem monta a página decide (ver `VARIACAO_INDICADORES`
 * em `pesquisasComum.ts`, que documenta por que ela ainda é vitrine). Sem
 * variação, a coluna 3 simplesmente não existe e a grade continua uniforme
 * (`h-full` + `items-center`).
 *
 * A ENTRADA é a MESMA cascata dos KPI Cards do Dashboard Executivo
 * (`ui/entrada-cards`): nenhum número de animação novo é criado aqui.
 * ============================================================================
 */
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { entradaCard } from '@/components/ui/entrada-cards';

export interface IndicadorPesquisaProps {
  titulo: string;
  valor: string;
  icone: LucideIcon;
  /** Tinta do quadrado do ícone (token semântico da métrica). */
  caixa: string;
  /** Texto da variação já formatado; omitido = indicador sem comparação. */
  variacao?: string;
  /** Índice na cascata de entrada do grupo. */
  indice?: number;
}

export function IndicadorPesquisa({
  titulo,
  valor,
  icone: Icone,
  caixa,
  variacao,
  indice = 0,
}: IndicadorPesquisaProps) {
  return (
    <motion.div
      {...entradaCard(indice)}
      className="grid h-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 rounded-[12px] border border-border/50 bg-gradient-to-b from-card to-card/60 p-3"
    >
      <span className={cn('row-span-2 grid h-9 w-9 shrink-0 place-items-center rounded-full', caixa)}>
        <Icone className="h-4 w-4" aria-hidden />
      </span>

      <p className="col-start-2 row-start-1 flex min-w-0 items-center gap-1 truncate text-xs font-normal leading-snug tracking-wide text-muted-foreground">
        <span className="truncate" title={titulo}>
          {titulo}
        </span>
      </p>

      <p className="col-start-2 row-start-2 truncate text-2xl font-display font-semibold leading-none tabular-nums text-foreground">
        {valor}
      </p>

      {/* Variação · coluna 3 / linha 2: cai sozinha no centro vertical do
          número (a linha 2 mede só a altura do valor, sem margem própria) e
          `justify-self-end` a encosta no extremo direito do card. */}
      {variacao && (
        <span className="col-start-3 row-start-2 inline-flex items-center justify-self-end gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-snug text-success">
          <TrendingUp className="h-3 w-3 shrink-0" aria-hidden />
          {variacao}
        </span>
      )}
    </motion.div>
  );
}
