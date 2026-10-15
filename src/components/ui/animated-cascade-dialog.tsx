import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { CascadeDialogFrame } from './cascade-dialog';
import { cascadeItemVariants } from './cascade-motion';

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

// A coreografia (números, variants e timing) mora em `./cascade-motion.ts`; a
// MOLDURA animada (véu + caixa + corpo) vive em `./cascade-dialog.tsx` — a
// fonte única, consumida por este popup E por janelas grandes que têm layout
// próprio mas precisam da MESMA sensação (ex.: "Ver detalhes" da Auditoria).

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

  return (
    <CascadeDialogFrame open={open} onOpenChange={onOpenChange} blocks={totalItens} className={className}>
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
    </CascadeDialogFrame>
  );
}
