import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InfoTooltipProps {
  /** Texto (ou nó) explicativo exibido dentro do balão. */
  content: React.ReactNode;
  /**
   * Gatilho customizado. Sem `children`, renderiza o ícone `Info` padrão —
   * use isso quando não houver espaço para um ícone (ex.: número de um KPI),
   * combinando com o componente `TooltipHelpText` abaixo.
   */
  children?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  /** Classe aplicada ao ícone/gatilho padrão. */
  className?: string;
  contentClassName?: string;
}

/**
 * Ícone `[i]` com balão de ajuda: fundo escuro fixo (não depende do tema),
 * `max-w-[250px]`, `delayDuration=200` e foco por teclado — Radix já mostra o
 * tooltip em `onFocus`/`onBlur` do gatilho, então basta o gatilho ser um
 * elemento focável (o `<button>` padrão abaixo já é).
 */
export function InfoTooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  className,
  contentClassName,
}: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children ?? (
            <button
              type="button"
              aria-label="Mais informações"
              className={cn(
                'inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center align-middle text-muted-foreground/60 outline-none transition-colors hover:text-muted-foreground focus-visible:text-foreground',
                className,
              )}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={cn(
            'max-w-[250px] rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[11px] leading-relaxed text-slate-50 shadow-lg',
            contentClassName,
          )}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Variante para quando não há espaço para o ícone `[?]`: o próprio texto
 * vira o gatilho, com sublinhado pontilhado sutil e `cursor-help`.
 */
export function TooltipHelpText({
  content,
  children,
  className,
  side = 'top',
  align = 'center',
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}) {
  return (
    <InfoTooltip content={content} side={side} align={align}>
      <button
        type="button"
        className={cn(
          'cursor-help border-b border-dotted border-muted-foreground/50 text-left outline-none transition-colors hover:border-muted-foreground focus-visible:border-foreground',
          className,
        )}
      >
        {children}
      </button>
    </InfoTooltip>
  );
}
