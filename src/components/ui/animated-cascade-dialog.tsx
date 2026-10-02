import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnimatedCascadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  titleIcon: LucideIcon;
  titleIconClassName?: string;
  emptyMessage: string;
  /** Um ReactNode por item — a caixa já cuida do wrapper de animação
   * (`motion.div variants={cascadeItemVariants}`) em volta de cada um. */
  items: React.ReactNode[];
  /** Sobrepõe a largura padrão (`max-w-[460px]`, compacta) — usar só quando
   * o conteúdo genuinamente precisa de mais espaço (ex.: tabela). */
  className?: string;
}

// A coreografia (números, variants e timing) mora em `./cascade-motion.ts`: é a
// fonte única, consumida por este popup E pelas janelas grandes que têm layout
// próprio mas precisam da MESMA sensação (ex.: `DetalhesAdmissaoDialog`).
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from './cascade-motion';

export function AnimatedCascadeDialog({
  open,
  onOpenChange,
  title,
  titleIcon: TitleIcon,
  titleIconClassName,
  emptyMessage,
  items,
  className,
}: AnimatedCascadeDialogProps) {
  // Cabeçalho + cada item cascateiam juntos: o cabeçalho entra primeiro
  // (índice 0) e, no fechamento, some por último — a caixa só começa a
  // encolher depois que o último item já sumiu (daí o `delay` derivado da
  // contagem de blocos, dentro de `cascadeShellVariants`).
  const totalItens = items.length + 1;

  const shellVariantsSequenced = cascadeShellVariants(totalItens);
  const containerVariants = cascadeContainerVariants;
  const overlayVariants = cascadeOverlayVariants(totalItens);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                variants={overlayVariants}
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
                variants={shellVariantsSequenced}
                initial="closed"
                animate="open"
                exit="closed"
              >
                <DialogPrimitive.Close className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md opacity-70 transition-colors hover:bg-accent hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fechar</span>
                </DialogPrimitive.Close>

                <motion.div
                  variants={containerVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className="p-5 space-y-3"
                >
                  <motion.div variants={cascadeItemVariants}>
                    <DialogPrimitive.Title className="flex items-center gap-2 font-display text-[17px] font-semibold leading-snug tracking-tight">
                      <TitleIcon className={titleIconClassName ?? 'h-4 w-4 text-primary'} /> {title}
                    </DialogPrimitive.Title>
                  </motion.div>

                  <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
                    {items.length === 0 ? (
                      <motion.p variants={cascadeItemVariants} className="text-[13px] text-muted-foreground">
                        {emptyMessage}
                      </motion.p>
                    ) : (
                      items.map((item, i) => (
                        <motion.div key={i} variants={cascadeItemVariants}>
                          {item}
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
