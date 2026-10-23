import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';

/**
 * ============================================================================
 * TREINAMENTOS — ADAPTADOR LOCAL DA ANIMAÇÃO DE PENDÊNCIAS.
 *
 * Reaproveita LITERALMENTE `cascade-motion.ts` (a fonte única usada pelo modal
 * Pendências e pelo `CascadeDialogFrame`):
 *   • véu ........ `cascadeOverlayVariants` (fade + backdrop-blur)
 *   • caixa ...... `cascadeShellVariants` (quadrado → laterais → altura)
 *   • corpo ...... `cascadeContainerVariants` (stagger 0,1 s)
 *   • blocos ..... `cascadeItemVariants` (opacity + y: 8)
 *
 * A diferença para o `CascadeDialogFrame` é somente a MOLDURA ESTÁTICA: aqui
 * ela mantém exatamente as classes do `DialogContent` já usado em Treinamentos
 * (grid, padding, borda, raio, largura). A casca é `display: contents`, então
 * os blocos continuam sendo filhos diretos do grid e nenhum espaçamento muda.
 *
 * Toda a semântica continua no Radix: role/aria, focus trap, Escape, clique
 * no véu, restauração de foco e bloqueio de scroll.
 * ============================================================================
 */
export interface TreinamentosCascadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nº de blocos que cascateiam — define o atraso de saída do shell. */
  blocks: number;
  /** Classes da caixa (largura/scroll específicos; o restante é o padrão). */
  className?: string;
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
}

export function TreinamentosCascadeDialog({
  open,
  onOpenChange,
  blocks,
  className,
  onCloseAutoFocus,
  children,
}: TreinamentosCascadeDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                variants={cascadeOverlayVariants(blocks)}
                initial="closed"
                animate="open"
                exit="closed"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount onCloseAutoFocus={onCloseAutoFocus}>
              <motion.div
                className={cn(
                  'fixed left-[50%] top-[50%] z-50 grid w-full max-w-[460px] translate-x-[-50%] translate-y-[-50%] gap-3 border bg-background p-5 shadow-lg sm:rounded-lg',
                  className
                )}
                style={{ transformOrigin: 'top center' }}
                variants={cascadeShellVariants(blocks)}
                initial="closed"
                animate="open"
                exit="closed"
              >
                <motion.div
                  className="contents"
                  variants={cascadeContainerVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  {children}
                </motion.div>
                <DialogPrimitive.Close className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md opacity-70 transition-colors hover:bg-accent hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fechar</span>
                </DialogPrimitive.Close>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

/** Bloco semântico da cascata. Use como filho direto da moldura. */
export function TreinamentosCascadeItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={cascadeItemVariants} className={className}>
      {children}
    </motion.div>
  );
}
