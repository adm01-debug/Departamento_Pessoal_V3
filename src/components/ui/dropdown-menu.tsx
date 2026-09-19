import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  overlayContentCloseOnlyAnimClasses,
  overlaySubmenuAnimClasses,
  dropdownContentVariants,
  dropdownItemVariants,
  CHECK_INDICATOR_ANIM_CLASSES,
} from '@/components/ui/motion-presets';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;

// `group`: dá contexto pro `group-data-[state=open]:rotate-180` de qualquer
// chevron que o consumidor renderize dentro do Trigger (convenção também
// usada por `select.tsx` — só faltava vir de fábrica aqui pra não precisar
// repetir `className="group"` em cada tela).
const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Trigger ref={ref} className={cn('group', className)} {...props} />
));
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

// Mesma arquitetura de `select.tsx` (Fase 9 do pedido original: Motion real,
// não só CSS): `DropdownMenuPrimitive.Item` continua intocado (ref/roving-
// focus/typeahead/Collection do Radix), e só `{children}` é envolvido por um
// `motion.span` com `dropdownItemVariants` — o MESMO objeto usado por
// `SelectItem`, não uma cópia (Fase 8: "proibido criar 100 cópias"). Herda
// open/closed do `motion.div` ancestral em `DropdownMenuContent`.
// `[gap:inherit]`: muitos consumidores (`user-profile-menu.tsx`,
// `QuickActionsMenu.tsx`, etc.) usam `className="gap-3 ..."` no PRÓPRIO
// `DropdownMenuItem` pra espaçar ícone+texto — como esses filhos agora ficam
// dentro do wrapper (não mais filhos diretos do Item), o `gap-3` do Item não
// teria mais efeito (só se aplica entre filhos DIRETOS). `gap: inherit` é
// CSS padrão (funciona em qualquer propriedade, não só as herdáveis por
// padrão): o wrapper recalcula o MESMO valor de `gap` computado do pai,
// reproduzindo o espaçamento original sem duplicar a classe.
const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-xs px-2 py-1.5 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      <motion.span
        variants={dropdownItemVariants}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
        className="flex w-full items-center [gap:inherit]"
      >
        {children}
      </motion.span>
    </DropdownMenuPrimitive.Item>
  );
});
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, ref) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
          // Fechamento em CSS (mesmo motivo/técnica de `select.tsx`): o
          // wrapper Motion abaixo não usa `AnimatePresence`, então não anima
          // a saída sozinho — Radix unmonta assim que fecha, e essa classe
          // garante que a saída ainda tenha uma transição (CSS `animation`
          // no próprio Content, nunca conflita com o `transform` do Popper
          // por ser `animation`, não `transition` competindo pela mesma
          // propriedade o tempo todo).
          overlayContentCloseOnlyAnimClasses('dp-dropdown-anim-content'),
          className,
        )}
        {...props}
      >
        {/* Wrapper Motion INTERNO real — mesmo `dropdownContentVariants` de
            `select.tsx`, não uma cópia. Content acima continua 100% Radix
            (posicionamento/Popper/collision, intocado); só este `motion.div`
            anima opacity/scale/y e orquestra o stagger dos itens. */}
        <motion.div
          initial="closed"
          animate="open"
          variants={dropdownContentVariants}
          transition={prefersReducedMotion ? { duration: 0, staggerChildren: 0, delayChildren: 0 } : undefined}
        >
          {children}
        </motion.div>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

// Submenu (Fase D / Fase 14): ainda sem nenhum consumidor no app (auditoria
// não encontrou uso de Sub/SubTrigger/SubContent), mas o design system
// precisa estar pronto pra quando surgir, sem reinventar a animação — usa a
// variante LATERAL do preset (x, não y), porque abre pro lado, não pra
// baixo. `group/sub` + `data-[state=open]:bg-accent` no Trigger: mesma
// convenção do shadcn, escopo próprio (`/sub`) pra não colidir com o
// `group` do Content quando o submenu está aninhado dentro dele.
const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        'flex cursor-default select-none items-center rounded-xs px-2 py-1.5 text-sm outline-hidden focus:bg-accent data-[state=open]:bg-accent',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      <motion.span
        variants={dropdownItemVariants}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
        className="flex w-full items-center [gap:inherit]"
      >
        {children}
      </motion.span>
      {/* Ponteiro estático de "abre um submenu à direita" — não é um chevron
          de abrir/fechar (Fase 10), não rotaciona. */}
      <ChevronRight className="ml-auto h-4 w-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
});
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg',
        overlaySubmenuAnimClasses('dp-dropdown-anim-submenu'),
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

// Adicionados para os dropdowns de período do Dashboard Executivo (seleção
// única entre 3/6/12 meses — semanticamente um RadioGroup, não Checkboxes:
// só uma opção fica marcada por vez, refletindo o `value`/`onValueChange`
// que já dirige o estado `periodo`). Puramente aditivo — nenhum componente
// pré-existente acima foi alterado, então os outros ~23 usos de
// DropdownMenu no app não são afetados.
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-xs py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors duration-150 focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator className={CHECK_INDICATOR_ANIM_CLASSES}>
          <Check className="h-4 w-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      <motion.span
        variants={dropdownItemVariants}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
        className="flex w-full items-center [gap:inherit]"
      >
        {children}
      </motion.span>
    </DropdownMenuPrimitive.RadioItem>
  );
});
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
};
