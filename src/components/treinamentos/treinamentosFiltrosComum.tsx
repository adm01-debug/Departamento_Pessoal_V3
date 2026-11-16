import type { LucideIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * Trigger de filtro do Hub de Treinamentos — usado pela aba Treinamentos e pelo
 * Catálogo. Rótulo pequeno em caixa alta + valor selecionado, 44 px de altura,
 * raio e borda do Design System. Nenhuma cor nova: o trigger continua `bg-card`.
 */

export interface OpcaoFiltro {
  value: string;
  label: string;
}

export function FiltroSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  title,
  className,
  icone: Icone,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  options: readonly OpcaoFiltro[];
  disabled?: boolean;
  title?: string;
  className?: string;
  /** Ícone opcional à direita do valor (ex.: `ArrowUpDown` em “Ordenar por”). */
  icone?: LucideIcon;
}) {
  const rotuloSelecionado = options.find((opcao) => opcao.value === value)?.label ?? value;

  return (
    <div className={cn('min-w-0', className)} title={title}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          aria-label={label}
          className="h-11 w-full rounded-xl border-border/60 bg-card px-3 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
              <span className="whitespace-nowrap text-[9.5px] uppercase leading-none tracking-[0.08em] text-muted-foreground">
                {label}
              </span>
              <span className="w-full truncate text-[12px] leading-tight text-foreground" title={rotuloSelecionado}>
                {rotuloSelecionado}
              </span>
            </div>
            {Icone && <Icone aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />}
          </div>
        </SelectTrigger>
        <SelectContent side="bottom" align="start">
          {options.map((opcao) => (
            <SelectItem key={opcao.value} value={opcao.value}>
              {opcao.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
