import { useCallback, useEffect, useState } from 'react';
import {
  CONFIG_ENTRADA_CARD_GLOBAL,
  atrasoDoSlot,
  slotConteudoIntercalado,
  type MapaSlotsEntrada,
} from '@/components/ui/entradaGlobal';

/**
 * ============================================================================
 * ENTRADA DO CARD → CONCLUSÃO → ANIMAÇÃO INTERNA
 * ============================================================================
 * Sincroniza as duas etapas da coreografia de um card "de conteúdo" (o card
 * inteiro entra e SÓ DEPOIS o conteúdo dentro dele anima):
 *
 *   1. a entrada do card é a régua global (`entradaConteudoGlobal`, montada em
 *      `components/ui/entradaGlobal.ts`): fade + subida de
 *      `CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs`, com o atraso do slot na cascata;
 *   2. a animação interna (contadores, rosca, legendas) só pode começar quando
 *      a etapa 1 terminar de fato — nunca no mesmo commit da montagem, senão
 *      ela roda escondida atrás do fade do card.
 *
 * COMO A CONCLUSÃO É DETECTADA
 * ----------------------------
 * Fonte primária: o callback REAL do Framer Motion (`onAnimationComplete`),
 * entregue no `MotionCard` da casca do card. Ele avisa quando a animação
 * daquele nó terminou — inclusive o `delay` da cascata. Não é uma estimativa:
 * é o mesmo evento que o Framer usa internamente.
 *
 * (O comentário antigo em `AnaliticosDesempenho.tsx` dizia que
 * `onAnimationComplete` não chega em `motion.create(Card)`. Isso não se aplica
 * a esta versão do Framer Motion: `VisualElement.mount()` chama
 * `update(props, …)`, que assina `props.onAnimationComplete` a partir das
 * props NÃO filtradas — as Motion props ficam com o nó de animação e só o
 * resto é repassado ao componente embrulhado.)
 *
 * REDE DE SEGURANÇA
 * -----------------
 * Se por qualquer motivo o callback não chegar (animação pulada por
 * `MotionConfig`, elemento removido/remontado no meio, navegador que não
 * dispara o `finished`), o estado destrava sozinho no fim EXATO da régua
 * (`atrasoDoSlot` + `duracaoMs` + margem). O objetivo é nunca deixar o
 * conteúdo permanentemente invisível: o gráfico sempre aparece. Essa rede não
 * antecipa nada — o instante calculado é o mesmo em que a entrada termina.
 * ============================================================================
 */

/**
 * Folga entre o fim calculado da régua e o destravamento de emergência —
 * absorve o atraso de 1 frame entre o fim da animação e o commit do React.
 */
const MARGEM_REDE_SEGURANCA_MS = 250;

export interface ControleEntradaCard {
  /** `true` a partir do momento em que a entrada do card terminou de rodar. */
  entradaConcluida: boolean;
  /** Handler para o `onAnimationComplete` do `MotionCard` da casca. */
  aoConcluirEntrada: () => void;
}

/**
 * Acompanha a entrada de um card da fila de CONTEÚDO
 * (`slotConteudoIntercalado` / `entradaConteudoGlobal`).
 *
 * @param slotCascata posição do card na fila — o MESMO número passado em
 *   `custom` para `entradaConteudoGlobal`.
 * @param mapaSlots mapa `posição → slot` da faixa em que o card entra. O padrão
 *   é a fila de CONTEÚDO (`slotConteudoIntercalado`); cards que usam a fila
 *   SIMPLES (`cardVariants` / `entradaCardGlobal`, `custom` = posição) passam
 *   `slotSequencial`. Só a rede de segurança olha esse mapa — a fonte primária
 *   continua sendo o `onAnimationComplete` real do `MotionCard`.
 */
export function useEntradaCardConcluida(
  slotCascata: number,
  mapaSlots: MapaSlotsEntrada = slotConteudoIntercalado
): ControleEntradaCard {
  const [entradaConcluida, setEntradaConcluida] = useState(false);

  // Identidade estável: o `MotionCard` não pode receber um handler novo a cada
  // render (seria ressincronizado pelo Framer sem necessidade).
  const aoConcluirEntrada = useCallback(() => setEntradaConcluida(true), []);

  // Fim da régua deste card (mesmos números que a variante usa) + margem.
  const msFimDaEntrada =
    atrasoDoSlot(mapaSlots(slotCascata)) * 1000 +
    CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs +
    MARGEM_REDE_SEGURANCA_MS;

  useEffect(() => {
    // Já concluída pelo callback real: nada a agendar.
    if (entradaConcluida) return;

    const id = window.setTimeout(() => setEntradaConcluida(true), msFimDaEntrada);
    return () => window.clearTimeout(id);
  }, [entradaConcluida, msFimDaEntrada]);

  return { entradaConcluida, aoConcluirEntrada };
}
