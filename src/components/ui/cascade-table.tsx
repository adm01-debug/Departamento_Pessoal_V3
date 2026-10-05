import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TableBody } from '@/components/ui/table';
import { linhaTabelaVariants } from '@/components/ui/table-row-reveal';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * MECANISMO COMPLETO da cascata de entrada das linhas de tabela — FONTE ÚNICA,
 * usada tanto pela lista de "Gestão de Candidatos" (`GestaoCandidatos.tsx`,
 * modo TABELA) quanto pela lista da Auditoria (`AuditoriaPage.tsx`).
 *
 * Isto é a árvore INTEIRA que produz a cascata, não só os valores do variant:
 *
 *   <AnimatePresence>            ← escudo de contexto de presença (sem props)
 *     <TableBody key={…}>        ← remonta quando a lista troca de identidade
 *       <motion.tr custom={i}…>  ← cada linha (variant compartilhado)
 *
 * Como os DOIS consumidores usam estes MESMOS componentes, é impossível a
 * Auditoria divergir da Gestão de Candidatos: existe uma única implementação.
 *
 * Por que cada peça:
 * - `AnimatePresence` LOCAL, sem props: um `AnimatePresence initial={false}` de
 *   um ancestral (ex.: `PageTransition` das rotas, ou a troca Tabela/Cards)
 *   publica esse valor por CONTEXTO até cada `motion.*` descendente — que então
 *   PULARIA o keyframe `hidden` e as linhas apareceriam prontas, sem cascata. Um
 *   contexto novo (sem props, `initial` verdadeiro) devolve a cascata à
 *   subárvore. Não renderiza DOM.
 * - `key` no `<TableBody>`: quando a lista muda de identidade (página,
 *   ordenação, filtros) o tbody remonta e a cascata toca de novo — sem reanimar
 *   a cada hover/tecla.
 * - `motion.tr` PURO (não `motion.create(TableRow)`) preserva o ref/forwardRef —
 *   mesmo motivo documentado em `ColaboradorTable.tsx`.
 * - `origin-center`: o `scaleX` do variant abre cada linha a partir do CENTRO.
 *
 * Os valores visuais da linha (opacity/y/scaleX, duração, atraso e easing) vêm
 * de `linhaTabelaVariants` (`ui/table-row-reveal.ts`) — também compartilhado.
 * ============================================================================
 */

/**
 * A "moldura" da cascata: `AnimatePresence` (escudo) + `TableBody` com `key`.
 * Recebe as linhas como filhos e é o ÚNICO lugar do sistema que monta o
 * `<tbody>` animado da lista.
 */
export function CascadeTableBody({ cascadeKey, children }: { cascadeKey: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      <TableBody key={cascadeKey}>{children}</TableBody>
    </AnimatePresence>
  );
}

type CascadeTableRowProps = {
  /** Índice na lista — vira o `custom` do variant (base do stagger). */
  index: number;
} & Omit<React.ComponentProps<typeof motion.tr>, 'custom' | 'variants' | 'initial' | 'animate' | 'ref'>;

/**
 * Uma linha da lista em cascata. O componente é DONO das props de animação
 * (`custom`/`variants`/`initial`/`animate`) e da classe `origin-center` — quem
 * consome só passa `index`, `key`, `className` (visual da tela) e o conteúdo.
 * Assim nenhum consumidor consegue alterar a animação por engano.
 */
export const CascadeTableRow = React.forwardRef<HTMLTableRowElement, CascadeTableRowProps>(function CascadeTableRow(
  { index, className, children, ...rest },
  ref
) {
  return (
    <motion.tr
      ref={ref}
      {...rest}
      custom={index}
      variants={linhaTabelaVariants}
      initial="hidden"
      animate="visible"
      className={cn('origin-center', className)}
    >
      {children}
    </motion.tr>
  );
});
