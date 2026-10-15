import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  cascadeContainerVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from './cascade-motion';

/**
 * ============================================================================
 * CASCADE DIALOG FRAME — a MOLDURA animada oficial das janelas do sistema.
 *
 * Extrai de `AnimatedCascadeDialog` (o popup compacto de Pendências/Próximos
 * Eventos) SÓ a mecânica de abertura/fechamento para que janelas com layout
 * PRÓPRIO — como "Ver detalhes" da Auditoria — tenham a MESMA animação sem
 * duplicar (e sem alterar) os números e variants de `cascade-motion.ts`.
 *
 * O que é reaproveitado ao pé da letra:
 *   • o véu (`cascadeOverlayVariants`) — fade + `backdrop-blur-sm`;
 *   • a caixa (`cascadeShellVariants`) — o "quadrado de dentro pra fora" que
 *     estica as laterais e depois a altura, e encolhe na ordem inversa;
 *   • o corpo (`cascadeContainerVariants`) + `cascadeItemVariants` — a cascata
 *     dos blocos, que fecha de trás para frente;
 *   • o `transformOrigin: 'top center'` e o `translate-x/y` (propriedade
 *     `translate`, que não briga com o `transform` do Framer).
 *
 * `blocks` é o número de blocos que cascateiam (título + seções): é dele que sai
 * o `delay` com que a caixa começa a encolher, para ela só fechar depois que o
 * último bloco já sumiu.
 *
 * O consumidor desenha os blocos: envolva cada filho em
 * `<motion.div variants={cascadeItemVariants}>` para ele participar da cascata.
 * ============================================================================
 */
export interface CascadeDialogFrameProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quantos blocos cascateiam (título + seções). */
  blocks: number;
  /** Classes da CAIXA. O padrão é o da janela compacta (`max-w-[460px]`). */
  className?: string;
  /** Classes do corpo interno que orquestra a cascata. */
  contentClassName?: string;
  children: ReactNode;
}

export function CascadeDialogFrame({
  open,
  onOpenChange,
  blocks,
  className,
  contentClassName = 'p-5 space-y-3',
  children,
}: CascadeDialogFrameProps) {
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
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className={cn(
                  'fixed left-1/2 top-1/2 z-50 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border/50 bg-background shadow-lg',
                  className
                )}
                style={{ transformOrigin: 'top center' }}
                variants={cascadeShellVariants(blocks)}
                initial="closed"
                animate="open"
                exit="closed"
              >
                <DialogPrimitive.Close className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md opacity-70 transition-colors hover:bg-accent hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fechar</span>
                </DialogPrimitive.Close>

                <motion.div
                  variants={cascadeContainerVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className={contentClassName}
                >
                  {children}
                </motion.div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
