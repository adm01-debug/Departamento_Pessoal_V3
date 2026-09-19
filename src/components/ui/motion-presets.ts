import type { Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Linguagem de motion ÚNICA para todo overlay que abre uma lista de opções
 * (Select, DropdownMenu, Combobox/Popover-como-seletor, ContextMenu, Menubar).
 * Mudar os números aqui é o único lugar que precisa mudar para atualizar a
 * animação do sistema inteiro — mas ver a nota "POR QUE OS NÚMEROS TAMBÉM
 * ESTÃO LITERAIS ABAIXO" antes de editar.
 */
export const DROPDOWN_MOTION = {
  openDurationMs: 220,
  closeDurationMs: 150,
  itemDurationMs: 170,
  staggerStepMs: 45,
  delayChildrenMs: 20,
  chevronDurationMs: 180,
  /** Acima disso os itens continuam entrando, só param de ganhar mais atraso
   * — evita uma lista de 20-30 opções levar >1s pra terminar de aparecer. */
  maxStaggeredItems: 10,
} as const;

/**
 * POR QUE OS NÚMEROS TAMBÉM ESTÃO LITERAIS ABAIXO (não interpolados a partir
 * de `DROPDOWN_MOTION`): as funções `overlay*AnimClasses` abaixo geram
 * classNames do Tailwind (`data-[state=open]:duration-[180ms]` etc). O JIT do
 * Tailwind escaneia o TEXTO LITERAL dos arquivos-fonte em build time — ele
 * não executa JS, então uma string montada via template literal
 * (`` `duration-[${DROPDOWN_MOTION.openDurationMs}ms]` ``) nunca apareceria
 * como candidata e a classe simplesmente não seria gerada (purgada
 * silenciosamente). Por isso os valores abaixo são literais, sincronizados
 * a mão com `DROPDOWN_MOTION` (mesmos números, comentado onde correspondem).
 * Trade-off aceito conscientemente: um único ponto de EDIÇÃO (estas duas
 * funções), não um único ponto de FONTE em runtime.
 */

/**
 * Fechamento do container do overlay: abre = wrapper Framer Motion real
 * (`dropdownContentVariants`/`motion.div`, ver `select.tsx`/`dropdown-menu.tsx`/
 * `popover.tsx`); fecha = esta técnica CSS via `data-state` do próprio Radix —
 * o wrapper Motion não usa `AnimatePresence`/estado controlado, então não
 * anima a SAÍDA sozinho (Radix desmonta o Content assim que fecha). Manter só
 * o lado `closed` aqui evita a abertura ter DUAS animações concorrendo pela
 * mesma propriedade (proibido pelas instruções). Nunca sobrescreve o
 * `transform` inline que o Popper/Floating UI usa pra posicionar: é uma
 * `animation` CSS, que tem prioridade de cascata só durante os ~150ms em que
 * toca, devolvendo o controle pro Popper depois — não é uma
 * `transition`/classe estática competindo pela mesma propriedade o tempo
 * todo. `origin-*`/`slide-*` variam com `data-side` pra respeitar de que
 * lado o menu realmente abriu. `markerClass`: nome próprio e incondicional
 * (sem prefixo de variante) só pro override de `prefers-reduced-motion` em
 * index.css — a classe que o Tailwind gera pra `data-[state=closed]:animate-out`
 * é literalmente `data-\[state\=closed\]\:animate-out`, nunca aparece "pura"
 * no elemento, então um seletor `.animate-out` no CSS nunca bateria; cada
 * consumidor precisa da própria classe-marcador (`select-content-anim`,
 * `dp-dropdown-anim-content`, `popover-content-anim`) registrada no bloco de
 * reduced-motion.
 */
export function overlayContentCloseOnlyAnimClasses(markerClass: string) {
  return cn(
    markerClass,
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
    'data-[state=closed]:zoom-out-[.96]',
    'data-[side=bottom]:origin-top data-[side=top]:origin-bottom data-[side=right]:origin-left data-[side=left]:origin-right',
    'data-[side=bottom]:data-[state=closed]:slide-out-to-top-2',
    'data-[side=top]:data-[state=closed]:slide-out-to-bottom-2',
    'data-[side=right]:data-[state=closed]:slide-out-to-left-2',
    'data-[side=left]:data-[state=closed]:slide-out-to-right-2',
    // 150ms == DROPDOWN_MOTION.closeDurationMs
    'data-[state=closed]:duration-[150ms] ease-out',
  );
}

/**
 * Variante lateral pra submenu (Fase 14): opacity + scale + x (nunca y),
 * também guiada por `data-side` (submenu abre pra `right` OU `left`
 * dependendo do espaço disponível). Ainda sem consumidor no app hoje — não
 * há `DropdownMenuSubContent`/`ContextMenu`/`Menubar` implementados (ver
 * auditoria), mas o preset já existe pronto pra quando isso for adicionado,
 * em vez de cada implementação futura inventar a própria animação.
 */
export function overlaySubmenuAnimClasses(markerClass: string) {
  return cn(
    markerClass,
    'group',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    'data-[state=closed]:zoom-out-[.98] data-[state=open]:zoom-in-[.98]',
    'data-[side=right]:origin-left data-[side=left]:origin-right',
    'data-[side=right]:data-[state=closed]:slide-out-to-left-1 data-[side=right]:data-[state=open]:slide-in-from-left-1',
    'data-[side=left]:data-[state=closed]:slide-out-to-right-1 data-[side=left]:data-[state=open]:slide-in-from-right-1',
    // 220ms/150ms == DROPDOWN_MOTION.{open,close}DurationMs
    'data-[state=open]:duration-[220ms] data-[state=closed]:duration-[150ms] ease-out',
  );
}

/**
 * Chevron que representa abrir/fechar (Fase 10) — SÓ pra esse tipo de ícone.
 * Nunca aplique a MoreHorizontal/MoreVertical/Settings/Filter/Search/Edit:
 * esses não indicam estado aberto/fechado de um overlay, giram-los seria
 * enganoso. Estado vem do `data-state` real do primitive via `group-data`
 * (Trigger dos primitives compartilhados já expõe `.group`) — nenhum
 * `useState` novo só pra isso.
 */
export function overlayChevronAnimClasses(markerClass: string) {
  return cn(
    markerClass,
    // 180ms == DROPDOWN_MOTION.chevronDurationMs
    'transition-transform duration-[180ms] ease-out group-data-[state=open]:rotate-180',
  );
}

/**
 * Microanimação opcional do checkmark de item selecionado (Fase 11) — só
 * opacity/scale, sem afetar layout/acessibilidade. `data-[state=checked]` é
 * o próprio estado do Radix (Select/RadioItem/CheckboxItem), não um
 * `useState` novo.
 */
export const CHECK_INDICATOR_ANIM_CLASSES = cn(
  'data-[state=checked]:animate-in data-[state=checked]:fade-in-0 data-[state=checked]:zoom-in-[.8]',
  'duration-[120ms] ease-out',
);

// ---------------------------------------------------------------------------
// Variants Framer Motion — EM EXECUÇÃO DE VERDADE (motion.div/motion.span
// reais), NÃO CSS e NÃO documentação. Fonte ÚNICA: todo overlay que abre
// lista de opções consome estes MESMOS objetos, nunca uma cópia local
// (proibido pelas instruções) — quem consome cada um:
//   - `dropdownContentVariants` (container: opacity/scale/y + orquestra o
//     stagger via `staggerChildren`/`delayChildren`):
//       • `SelectContent`       (select.tsx)       — dentro de Viewport
//       • `DropdownMenuContent` (dropdown-menu.tsx) — dentro de Content
//       • `PopoverContent`      (popover.tsx)       — dentro de Content
//         (cobre Popover genérico e o combobox Popover+Command)
//   - `dropdownItemVariants` (item: opacity/y): envolve só os FILHOS de cada
//     item (nunca o primitive Radix/cmdk em si, que é `forwardRef` — ver
//     nota abaixo) via `motion.span`:
//       • `SelectItem`             — envolve só `SelectPrimitive.ItemText`
//         (o indicador de check é `absolute`, fora do fluxo)
//       • `DropdownMenuItem`/`DropdownMenuRadioItem`/`DropdownMenuSubTrigger`
//         — envolve `{children}`
//       • `CommandItem` (command.tsx, combobox)      — envolve `{children}`
//
// POR QUE UM WRAPPER INTERNO, NUNCA `motion.create(Item)`: todo primitive de
// item (Radix `Item`/`RadioItem`, cmdk `Item`) é `forwardRef` e precisa do
// próprio ref intacto pro roving-focus/typeahead/Collection funcionar.
// `motion.create(SelectPrimitive.Item)` foi testado e REJEITADO nesta troca:
// erro de TIPO real (TS2769) — `onDrag` do Framer Motion (gesto de arrastar)
// colide com o `onDrag` nativo de DOM que o `Item` (é um `div`) já aceita.
// Não é contornável sem `as any`. `ColaboradorTable.tsx` já documentou o
// mesmo tipo de risco de ref pra `motion.create()` em cima de forwardRef
// (por isso usa `motion.tr` puro, não `motion.create(TableRow)`).
// `[gap:inherit]` na className do wrapper: consumidores como
// `user-profile-menu.tsx`/`QuickActionsMenu.tsx` usam `className="gap-3"` no
// PRÓPRIO `DropdownMenuItem` pra espaçar ícone+texto; como esses filhos
// passam a ficar dentro do wrapper (não mais filhos diretos do Item), `gap`
// só faz efeito se o PRÓPRIO wrapper o tiver — `inherit` copia o valor
// computado do pai (Item) sem precisar duplicar a classe.
// ---------------------------------------------------------------------------

export const dropdownContentVariants: Variants = {
  closed: { opacity: 0, scale: 0.94, y: -8 },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: DROPDOWN_MOTION.openDurationMs / 1000,
      ease: 'easeOut',
      when: 'beforeChildren',
      staggerChildren: DROPDOWN_MOTION.staggerStepMs / 1000,
      delayChildren: DROPDOWN_MOTION.delayChildrenMs / 1000,
    },
  },
};

export const dropdownItemVariants: Variants = {
  closed: { opacity: 0, y: -7 },
  open: { opacity: 1, y: 0, transition: { duration: DROPDOWN_MOTION.itemDurationMs / 1000, ease: 'easeOut' } },
};

/** Mesma família, versão lateral pra submenu (Fase 14) — x em vez de y. */
export const submenuContentVariants: Variants = {
  closed: { opacity: 0, scale: 0.98, x: -5 },
  open: { opacity: 1, scale: 1, x: 0, transition: { duration: DROPDOWN_MOTION.openDurationMs / 1000, ease: 'easeOut' } },
};
