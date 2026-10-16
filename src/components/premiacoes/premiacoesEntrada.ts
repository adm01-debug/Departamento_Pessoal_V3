/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — CADÊNCIA DE ENTRADA (a MESMA linguagem do Dashboard
 * Executivo, um pouco mais lenta).
 *
 * A LINGUAGEM de movimento é a do Dashboard Executivo — o objeto `cardVariants`
 * exportado por `src/components/dashboard/MetricCard.tsx` e empacotado em
 * `ui/entrada-cards.tsx`: fade + subida de 20px, ease
 * `[0.25, 0.46, 0.45, 0.94]`, cascata por índice, teto no 9º item. Nada disso
 * muda aqui: MESMA opacidade, MESMO deslocamento (20px), MESMA curva, MESMA
 * ordem de leitura (`premiacoesComum.ENTRADA_BASE`) e o MESMO gatilho (entrada
 * por montagem, uma vez por apresentação).
 *
 * O que muda é SÓ a cadência. Depois de ver a entrada no navegador, o usuário
 * pediu que ela ficasse "um pouco mais lenta". A `cardVariants` é a FONTE ÚNICA
 * compartilhada: mexer nela moveria junto o Dashboard Executivo (que o briefing
 * do Hub manda NÃO alterar), a Gestão de Desempenho (área congelada — ver
 * `.clinerules`) e Admissões/Desligamentos/Recrutamento/Organograma, que
 * importam `ui/entrada-cards.tsx`. Por isso a cadência do Hub mora AQUI e é a
 * régua de referência COM DOIS NÚMEROS escalados — nenhuma variante nova,
 * nenhum movimento novo.
 *
 *   referência (Dashboard Executivo)  →  duração 0.40s · passo 0.08s por índice
 *   Hub de Premiações (esta cadência) →  duração 0.55s · passo 0.10s por índice
 *
 * O teto de índices (`MAX_ENTRADA_INDEX = 8`, o MESMO de `ui/entrada-cards.tsx`)
 * continua valendo: o item mais atrasado começa em 0.80s e a tela termina de
 * entrar em ~1.35s (contra ~1.04s da referência) — "um pouco mais lenta" sem
 * virar espera para usar o rodapé da lista. Calibrar de novo é mexer em DOIS
 * números: `DURACAO_S` e `PASSO_S`.
 * ============================================================================
 */
import type { Variants } from 'framer-motion';
import { MAX_ENTRADA_INDEX } from '@/components/ui/entrada-cards';

/** Duração de cada item (a referência do Dashboard usa 0.4s). */
const DURACAO_S = 0.55;

/** Atraso por índice — o passo da cascata (a referência usa 0.08s). */
const PASSO_S = 0.1;

/** A curva é EXATAMENTE a da referência (`dashboard/MetricCard.tsx`). */
const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

/**
 * `cardVariants` do Dashboard Executivo com a cadência do Hub. Mantido com os
 * mesmos nomes de chave (`hidden`/`visible`) e o mesmo `custom` numérico, para
 * que o call site continue sendo só `{...entradaCard(indice)}`.
 */
export const cardVariantsHub: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * PASSO_S, duration: DURACAO_S, ease: EASE },
  }),
};

/**
 * As MESMAS props de `ui/entrada-cards.entradaCard` (mesmo teto de índice, mesmo
 * `initial`/`animate`), apontando para a cadência do Hub. Os 30+ call sites do
 * módulo não mudam: só a origem do import.
 */
export function entradaCard(index = 0) {
  return {
    custom: Math.min(Math.max(index, 0), MAX_ENTRADA_INDEX),
    variants: cardVariantsHub,
    initial: 'hidden',
    animate: 'visible',
  };
}

/**
 * A blindagem de contexto é a MESMA do resto do sistema (o
 * `AnimatePresence initial={false}` do `PageTransition` bloqueia o keyframe
 * `hidden`): reexportada para que o módulo tenha um import só.
 */
export { EntradaPresenca } from '@/components/ui/entrada-cards';
