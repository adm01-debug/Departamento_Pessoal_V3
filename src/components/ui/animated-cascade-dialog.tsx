import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { X, type LucideIcon } from 'lucide-react';

export interface AnimatedCascadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  titleIcon: LucideIcon;
  titleIconClassName?: string;
  emptyMessage: string;
  /** Um ReactNode por item — a caixa já cuida do wrapper de animação
   * (`motion.div variants={itemVariants}`) em volta de cada um. */
  items: React.ReactNode[];
}

// Popup usado tanto pelo "Ver todas" das Pendências quanto pelo "Ver
// todos" dos Próximos Eventos (e qualquer outro card de resumo que
// precise da mesma coreografia) — pra manter as duas animações
// EXATAMENTE iguais, a lógica mora num só lugar.
//
// Abertura: a caixa nasce como um quadrado pequeno "de dentro pra fora"
// (scaleX/scaleY 0→0.16), estica as laterais até a largura final
// (scaleX 0.16→1, altura ainda curta) e só então desce esticando a
// altura (scaleY 0.16→1) — as três fases moram no mesmo keyframe/`times`
// pra ficarem sincronizadas num timeline só. Aí sim o conteúdo cascateia
// (cabeçalho primeiro, depois cada item).
//
// Fechamento: exatamente o inverso — itens somem em cascata de trás pra
// frente, e só depois que o último terminar é que a caixa encolhe
// (altura primeiro, depois largura) até virar o quadrado pequeno de novo.
const SHELL_OPEN_DURATION = 0.9;
const SHELL_CLOSE_DURATION = 0.55;
const ITEM_STAGGER = 0.1;
const ITEM_DURATION_OUT = 0.22;

const shellVariants: Variants = {
  closed: {
    scaleX: [1, 1, 0.16, 0],
    scaleY: [1, 0.16, 0.16, 0],
    transition: { duration: SHELL_CLOSE_DURATION, times: [0, 0.4, 0.75, 1], ease: 'easeInOut' },
  },
  open: {
    scaleX: [0, 0.16, 1, 1],
    scaleY: [0, 0.16, 0.16, 1],
    transition: { duration: SHELL_OPEN_DURATION, times: [0, 0.22, 0.6, 1], ease: 'easeInOut' },
  },
};

const itemVariants: Variants = {
  closed: { opacity: 0, y: 8, transition: { duration: ITEM_DURATION_OUT, ease: 'easeIn' } },
  open: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export function AnimatedCascadeDialog({
  open, onOpenChange, title, titleIcon: TitleIcon, titleIconClassName, emptyMessage, items,
}: AnimatedCascadeDialogProps) {
  // Cabeçalho + cada item cascateiam juntos: o cabeçalho entra primeiro
  // (índice 0) e, no fechamento, some por último — a caixa só começa a
  // encolher depois que o último item já sumiu (daí o `delay` calculado
  // abaixo a partir da mesma contagem/stagger usados no exit).
  const totalItens = items.length + 1;
  const closeContentDuration = (totalItens - 1) * ITEM_STAGGER + ITEM_DURATION_OUT;
  const totalCloseDuration = closeContentDuration + SHELL_CLOSE_DURATION;

  const shellVariantsSequenced: Variants = {
    ...shellVariants,
    closed: {
      ...shellVariants.closed,
      transition: { ...(shellVariants.closed as { transition?: object }).transition, delay: closeContentDuration },
    },
  };

  const containerVariants: Variants = {
    closed: { transition: { staggerChildren: ITEM_STAGGER, staggerDirection: -1 } },
    open: { transition: { staggerChildren: ITEM_STAGGER, delayChildren: SHELL_OPEN_DURATION } },
  };

  const overlayVariants: Variants = {
    closed: { opacity: 0, transition: { duration: totalCloseDuration, ease: 'easeInOut' } },
    open: { opacity: 1, transition: { duration: 0.25 } },
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                variants={overlayVariants}
                initial="closed"
                animate="open"
                exit="closed"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-primary/30 bg-background shadow-lg animate-pulse-glow-lime"
                style={{ transformOrigin: 'top center' }}
                variants={shellVariantsSequenced}
                initial="closed"
                animate="open"
                exit="closed"
              >
                <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-xs opacity-70 ring-offset-background hover:opacity-100">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fechar</span>
                </DialogPrimitive.Close>

                <motion.div
                  variants={containerVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className="p-6 space-y-4"
                >
                  <motion.div variants={itemVariants}>
                    <DialogPrimitive.Title className="flex items-center gap-2 font-display text-lg font-semibold leading-snug tracking-tight">
                      <TitleIcon className={titleIconClassName ?? 'h-5 w-5 text-primary'} /> {title}
                    </DialogPrimitive.Title>
                  </motion.div>

                  <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                    {items.length === 0 ? (
                      <motion.p variants={itemVariants} className="text-sm text-muted-foreground">
                        {emptyMessage}
                      </motion.p>
                    ) : items.map((item, i) => (
                      <motion.div key={i} variants={itemVariants}>
                        {item}
                      </motion.div>
                    ))}
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
