/**
 * ============================================================================
 * PREENCHIMENTO DAS BARRAS DA ANALYTICS — a coreografia do card
 * "Amplitude de Liderança" (`DashboardExecutivoPage`, aba Estrutura).
 *
 * Usado pelos DOIS painéis desta aba que têm barra dividindo a linha com o
 * texto: **Principais origens** e **Desempenho por vaga**. É um componente só
 * justamente para que os dois cresçam com o mesmo movimento — antes eram duas
 * barras CSS pintadas já cheias, cada uma com a sua cor.
 *
 * ── O QUE É REUTILIZADO (NADA DE ANIMAÇÃO NOVA) ─────────────────────────────
 *   duração ..... `BARRA_PROGRESSO_DURACAO_S` = 1,2 s — a régua global
 *                 (`ui/progressMotion.ts`), a MESMA constante que a referência
 *                 consome;
 *   curva ....... `easeOut`;
 *   cascata ..... `0,15 s + índice × 0,1 s` — o atraso da primeira barra e o
 *                 passo "de cima para baixo" da referência;
 *   movimento ... `width: 0 → percentual%` da esquerda para a direita.
 * Quem entrega esses números é `propsPreenchimentoBarraCascata` (régua global);
 * este arquivo não digita nenhum deles. O teste
 * `components/__tests__/BarrasProgressoRegua.test.ts` compara os valores com o
 * fonte do card de referência e cai se alguém inventar outro ritmo.
 *
 * ── TRÊS ESTADOS, E SÓ UM DELES ANIMA ──────────────────────────────────────
 *   `animar === false` ... barra em 0, CONGELADA. É o intervalo entre a
 *                          montagem do painel e o fim da entrada do card
 *                          (`useEntradaCardConcluida`): a barra já existe, com
 *                          o trilho e a cor no lugar, e começa visivelmente
 *                          vazia enquanto o card termina de subir;
 *   `animar === true` .... cresce de 0 até o percentual real, em cascata. Como
 *                          `animar` é monotônico (nunca volta para `false`),
 *                          hover, tooltip e troca de filtro não reiniciam a
 *                          varredura — e cada linha tem `key` estável, então
 *                          nada remonta no meio;
 *   `reduzirMovimento` ... `initial: false`: a Motion aplica a largura final no
 *                          primeiro quadro. Nada de espera, nada de varredura.
 *
 * ── O QUE ESTE COMPONENTE NÃO FAZ ──────────────────────────────────────────
 * Não desenha o trilho (cada painel tem o seu: `TRILHA_BARRA_INLINE` nas
 * origens, `TRILHA_BARRA_VAGA` nas vagas), não define altura, largura,
 * espaçamento, cantos nem cor padrão. Ele é só o preenchimento: `h-full` +
 * `rounded-full` + o gradiente recebido — dentro do trilho `overflow-hidden`
 * do painel, o degradê nunca escapa da área preenchida.
 * ============================================================================
 */
import { motion, type MotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { propsPreenchimentoBarraCascata } from '@/components/ui/progressMotion';

/**
 * Estado "ainda não animou": largura 0 nos DOIS lados (sem transição, sem
 * ida e volta quando `animar` virar `true`, porque o alvo muda e a Motion
 * interpola a partir de onde está).
 */
const BARRAS_OCULTAS: MotionProps = { initial: { width: 0 }, animate: { width: 0 } };

interface PreenchimentoBarraAnalyticsProps {
  /** Percentual final (0–100). Casas decimais são preservadas. */
  percentual: number;
  /** Posição na cascata (0 = primeira barra da lista). */
  indice?: number;
  /** `background-image` do preenchimento (ver `GRADIENTES_ORIGEM`). */
  gradiente: string;
  /** A entrada do card já terminou? (fonte: `useEntradaCardConcluida`) */
  animar: boolean;
  /** Movimento reduzido (fonte: `useMovimentoReduzido`). */
  reduzirMovimento: boolean;
  /** Classes extras do preenchimento (não usar para cor: ela vem do gradiente). */
  className?: string;
}

export function PreenchimentoBarraAnalytics({
  percentual,
  indice = 0,
  gradiente,
  animar,
  reduzirMovimento,
  className,
}: PreenchimentoBarraAnalyticsProps) {
  const props = animar
    ? propsPreenchimentoBarraCascata(percentual, indice, { reduzir: reduzirMovimento })
    : BARRAS_OCULTAS;

  return (
    <motion.span
      {...props}
      // O gradiente é a ÚNICA coisa que o painel escolhe: comprimento, altura e
      // cantos continuam vindo do trilho e das classes abaixo.
      style={{ backgroundImage: gradiente }}
      className={cn('block h-full rounded-full', className)}
    />
  );
}
