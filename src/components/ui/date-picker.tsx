import * as React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { formatDateLocalISO, parseDateLocalISO, todayLocalISO } from '@/utils/dateLocal';

export interface DatePickerProps {
  /** Data no mesmo formato `YYYY-MM-DD` usado pelo restante do app (ver
   * `src/utils/dateLocal.ts`) — o mesmo contrato de um `<input type="date">`
   * controlado, pra substituir 1:1 sem mudar validação/payload. */
  value?: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  'aria-label'?: string;
  /** Espelha `min`/`max` de `<input type="date">` — mesmas strings `YYYY-MM-DD`. */
  min?: string;
  max?: string;
}

/** DatePicker do Design System — substitui `<input type="date">` (calendário
 * nativo do navegador, claro, inconsistente entre SO/browser) por um popover
 * escuro reaproveitando os primitives já existentes (`Popover` + `Calendar`
 * + `Button`), no mesmo padrão já usado em `TelemetryFilters`. */
export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  ({ value, onChange, onBlur, placeholder = 'Selecionar data', disabled, className, id, name, min, max, ...rest }, ref) => {
    const [open, setOpen] = React.useState(false);
    const selected = parseDateLocalISO(value);
    const minDate = parseDateLocalISO(min);
    const maxDate = parseDateLocalISO(max);

    return (
      <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) onBlur?.(); }}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            name={name}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-9 w-full justify-start gap-2 rounded-lg border-input bg-background px-3 text-left text-[13px] font-normal hover:bg-background',
              !selected && 'text-muted-foreground',
              className,
            )}
            {...rest}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
            {selected ? format(selected, 'dd/MM/yyyy') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={selected}
            defaultMonth={selected}
            disabled={(day) => (minDate && day < minDate) || (maxDate && day > maxDate) || false}
            onSelect={(date) => {
              if (!date) return;
              onChange(formatDateLocalISO(date));
              setOpen(false);
            }}
          />
          <div className="flex items-center justify-between gap-2 border-t border-border/50 px-3 py-2">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="rounded-sm text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => { onChange(todayLocalISO()); setOpen(false); }}
              className="rounded-sm text-xs font-medium text-primary transition-colors hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              Hoje
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);
DatePicker.displayName = 'DatePicker';
