import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { overlayContentCloseOnlyAnimClasses, dropdownContentVariants } from '@/components/ui/motion-presets';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, children, ...props }, ref) => {
  const prefersReducedMotion = useReducedMotion();
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden',
          // Mesma linguagem/arquitetura de `select.tsx`/`dropdown-menu.tsx`:
          // wrapper Motion interno cobre a ABERTURA (real, não CSS); esta
          // classe cobre só o FECHAMENTO (o wrapper não usa AnimatePresence).
          // Cobre tanto o combobox (Popover + Command, ex.: AfastamentoForm)
          // quanto qualquer outro Popover (calendário, notificações etc.) —
          // a animação é só do container, serve pra qualquer conteúdo sem
          // presumir que é uma lista.
          overlayContentCloseOnlyAnimClasses('popover-content-anim'),
          className,
        )}
        {...props}
      >
        <motion.div
          initial="closed"
          animate="open"
          variants={dropdownContentVariants}
          transition={prefersReducedMotion ? { duration: 0, staggerChildren: 0, delayChildren: 0 } : undefined}
        >
          {children}
        </motion.div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
