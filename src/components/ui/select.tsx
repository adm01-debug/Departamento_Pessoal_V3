import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  overlayChevronAnimClasses,
  overlayContentCloseOnlyAnimClasses,
  dropdownContentVariants,
  dropdownItemVariants,
  CHECK_INDICATOR_ANIM_CLASSES,
} from '@/components/ui/motion-presets';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  // `group`: só pra dar contexto ao `group-data-[state=open]` do chevron
  // abaixo — não muda nada visualmente no próprio trigger.
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'group flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className={cn('h-4 w-4 opacity-50', overlayChevronAnimClasses('select-chevron'))} />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
          // Fechamento continua em CSS (Radix `data-state` + tailwindcss-animate):
          // o wrapper Motion abaixo não usa `AnimatePresence`/estado controlado,
          // então não tem como animar a SAÍDA sozinho — o Radix já unmonta o
          // Content assim que fecha. Isso NÃO conflita com o Motion porque cobre
          // um momento diferente (fechar) e uma propriedade que o Motion não
          // toca neste elemento (o Motion anima o wrapper interno, nunca o
          // `transform` deste Content, que é do Popper).
          overlayContentCloseOnlyAnimClasses('select-content-anim'),
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">
          {/* Wrapper Motion INTERNO real: Content/Viewport acima continuam
              100% Radix (posicionamento/Popper/scroll/collision, intocados).
              Só este `motion.div` anima opacity/scale/y — nunca escreve no
              `transform` inline que o Radix usa pra posicionar o popup.
              `staggerChildren`/`delayChildren` (em `dropdownContentVariants`)
              orquestram a entrada sequencial dos `SelectItem` — ver lá. */}
          <motion.div
            initial="closed"
            animate="open"
            variants={dropdownContentVariants}
            transition={prefersReducedMotion ? { duration: 0, staggerChildren: 0, delayChildren: 0 } : undefined}
          >
            {children}
          </motion.div>
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

// `motion.create(SelectPrimitive.Item)` foi testado e REJEITADO: dá erro de
// tipo real (não só de ref) — `onDrag` do Framer Motion (gesto de arrastar)
// colide com o `onDrag` nativo de DOM que o `Item` do Radix (é um `div` por
// baixo) já aceita, TS2769 "No overload matches this call". Por isso o Item
// Radix em si fica intocado (ref/seleção/teclado/Collection 100% originais)
// e só o `SelectPrimitive.ItemText` — o único filho que participa do fluxo
// flex do Item (o indicador de check é `absolute`, fora do fluxo) — é
// envolvido por um `motion.span` que carrega os `dropdownItemVariants` e
// herda open/closed do `motion.div` ancestral em `SelectContent`.
const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        // `transition-colors duration-150`: só o background/cor do texto anima
        // suavemente no hover/foco — nada de posição/tamanho se move.
        'relative flex w-full cursor-default select-none items-center rounded-xs py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors duration-150 focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator className={CHECK_INDICATOR_ANIM_CLASSES}>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <motion.span
        variants={dropdownItemVariants}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
        className="inline-flex w-full items-center"
      >
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      </motion.span>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
