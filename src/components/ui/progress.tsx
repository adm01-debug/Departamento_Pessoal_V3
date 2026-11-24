import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

/**
 * Barra de progresso compartilhada (Radix).
 *
 * O preenchimento cresce por `transform: translateX(-N%)` — o valor real vem
 * SEMPRE de `value`, nada é simulado aqui. A duração/curva vivem na régua
 * global do preenchimento (`duration-progresso` = 1200ms, `ease-out`, em
 * `src/index.css`), para o olho conseguir acompanhar a barra enchendo; a
 * classe-marcador `progress-indicator` é o gancho do override de
 * `prefers-reduced-motion` (barra aparece direto no valor final).
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { value?: number; indicatorClassName?: string }
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        'progress-indicator h-full w-full flex-1 bg-primary transition-all duration-progresso ease-out',
        indicatorClassName
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
