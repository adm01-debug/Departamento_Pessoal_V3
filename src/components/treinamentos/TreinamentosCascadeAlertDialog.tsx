import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { cascadeContainerVariants, cascadeOverlayVariants, cascadeShellVariants } from '@/components/ui/cascade-motion';

/**
 * Confirmações de Treinamentos com a MESMA coreografia de Pendências, mas
 * mantendo o primitivo `AlertDialog` (role="alertdialog", foco inicial seguro,
 * Escape/clique no véu bloqueados por padrão e ações Cancelar/Confirmar).
 *
 * A caixa repete exatamente as classes do `AlertDialogContent` atual; o wrapper
 * interno é `display: contents` para não alterar o grid/espaçamento.
 */
export interface TreinamentosCascadeAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: number;
  className?: string;
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
}

export function TreinamentosCascadeAlertDialog({
  open,
  onOpenChange,
  blocks,
  className,
  onCloseAutoFocus,
  children,
}: TreinamentosCascadeAlertDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <AlertDialogPrimitive.Portal forceMount>
            <AlertDialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                variants={cascadeOverlayVariants(blocks)}
                initial="closed"
                animate="open"
                exit="closed"
              />
            </AlertDialogPrimitive.Overlay>
            <AlertDialogPrimitive.Content asChild forceMount onCloseAutoFocus={onCloseAutoFocus}>
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
              </motion.div>
            </AlertDialogPrimitive.Content>
          </AlertDialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </AlertDialogPrimitive.Root>
  );
}
