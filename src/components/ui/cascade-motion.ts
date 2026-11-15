import type { Variants } from 'framer-motion';

/**
 * ============================================================================
 * Coreografia "cascade" — FONTE ÚNICA de toda janela que abre em cascata.
 *
 * Mora fora do componente de propósito (a regra `react-refresh/only-export-
 * components` exige que um arquivo que exporta componentes exporte SÓ eles):
 * assim `AnimatedCascadeDialog` (o popup compacto das Pendências/Próximos
 * Eventos) e as janelas GRANDES, que têm layout próprio mas precisam da MESMA
 * sensação — a de Detalhes da Admissão, por exemplo — importam os MESMOS
 * números e variants. Não existe uma segunda coreografia no sistema: mudar um
 * valor aqui move as duas juntas.
 *
 * Abertura: a caixa nasce como um quadrado pequeno "de dentro pra fora"
 * (scaleX/scaleY 0→0.16), estica as laterais até a largura final
 * (scaleX 0.16→1, altura ainda curta) e só então desce esticando a
 * altura (scaleY 0.16→1) — as três fases moram no mesmo keyframe/`times`
 * pra ficarem sincronizadas num timeline só. Aí sim o conteúdo cascateia
 * (cabeçalho primeiro, depois cada bloco).
 *
 * Fechamento: exatamente o inverso — os blocos somem em cascata de trás pra
 * frente, e só depois que o último terminar é que a caixa encolhe
 * (altura primeiro, depois largura) até virar o quadrado pequeno de novo.
 * ============================================================================
 */

export const CASCADE_SHELL_OPEN_DURATION = 0.9;
export const CASCADE_SHELL_CLOSE_DURATION = 0.55;
export const CASCADE_ITEM_STAGGER = 0.1;
export const CASCADE_ITEM_DURATION_OUT = 0.22;
export const CASCADE_ITEM_DURATION_IN = 0.35;
export const CASCADE_OVERLAY_OPEN_DURATION = 0.25;

/** Cascata do conteúdo: cada bloco entra de baixo (`y: 8`) e desaparece para baixo. */
export const cascadeItemVariants: Variants = {
  closed: { opacity: 0, y: 8, transition: { duration: CASCADE_ITEM_DURATION_OUT, ease: 'easeIn' } },
  open: { opacity: 1, y: 0, transition: { duration: CASCADE_ITEM_DURATION_IN, ease: 'easeOut' } },
};

/**
 * Encadeamento dos blocos. Abrindo, eles só começam DEPOIS que a caixa terminou
 * de abrir (`delayChildren` = duração da abertura da caixa); fechando, a cascata
 * corre de trás para frente e é ela que segura a caixa de encolher cedo demais.
 */
export const cascadeContainerVariants: Variants = {
  closed: { transition: { staggerChildren: CASCADE_ITEM_STAGGER, staggerDirection: -1 } },
  open: { transition: { staggerChildren: CASCADE_ITEM_STAGGER, delayChildren: CASCADE_SHELL_OPEN_DURATION } },
};

/** Quanto tempo a cascata de `blocos` leva para sumir (sem contar a caixa). */
function cascadeExitContentDuration(blocos: number): number {
  return (blocos - 1) * CASCADE_ITEM_STAGGER + CASCADE_ITEM_DURATION_OUT;
}

/**
 * Duração TOTAL da saída: a cascata dos blocos + o encolhimento da caixa. O
 * véu usa este número para desaparecer no mesmo compasso (e não antes de a
 * janela terminar de sair).
 */
export function cascadeCloseDuration(blocos: number): number {
  return cascadeExitContentDuration(blocos) + CASCADE_SHELL_CLOSE_DURATION;
}

/**
 * A caixa. `blocos` é quantos pedaços cascateiam antes de a caixa encolher
 * (cabeçalho + corpo + rodapé = 3, no modal de detalhes; cabeçalho + N itens,
 * no popup) — é desse número que sai o `delay` da saída.
 *
 * IMPORTANTE: quem anima `scaleX/scaleY` NÃO pode ter `scale-*` do Tailwind no
 * mesmo elemento; a centralização vai por `translate-x/y` (que no Tailwind v4 é
 * a propriedade `translate`, não `transform`) e por isso não briga com o
 * `transform` que o Framer escreve.
 */
export function cascadeShellVariants(blocos: number): Variants {
  return {
    closed: {
      scaleX: [1, 1, 0.16, 0],
      scaleY: [1, 0.16, 0.16, 0],
      transition: {
        duration: CASCADE_SHELL_CLOSE_DURATION,
        times: [0, 0.4, 0.75, 1],
        ease: 'easeInOut',
        delay: cascadeExitContentDuration(blocos),
      },
    },
    open: {
      scaleX: [0, 0.16, 1, 1],
      scaleY: [0, 0.16, 0.16, 1],
      transition: { duration: CASCADE_SHELL_OPEN_DURATION, times: [0, 0.22, 0.6, 1], ease: 'easeInOut' },
    },
  };
}

/** Véu por trás: entra rápido, sai junto com a saída inteira da janela. */
export function cascadeOverlayVariants(blocos: number): Variants {
  return {
    closed: { opacity: 0, transition: { duration: cascadeCloseDuration(blocos), ease: 'easeInOut' } },
    open: { opacity: 1, transition: { duration: CASCADE_OVERLAY_OPEN_DURATION } },
  };
}
