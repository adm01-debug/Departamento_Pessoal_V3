import * as React from 'react';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const INPUT_CLASSNAME = 'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-[13px] file:border-0 file:bg-transparent file:text-[13px] file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50';

/**
 * `type="date"` nunca renderiza o `<input type="date">` nativo (calendário
 * claro do SO/navegador, sem tema) — delega para o `DatePicker` do Design
 * System, mantendo o mesmo contrato `value`/`onChange` (string `YYYY-MM-DD`
 * + evento sintético com `.target.value`) que todo call-site já usa, então
 * nenhum formulário existente (useState direto ou `register()` do
 * react-hook-form) precisa mudar.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  if (type === 'date') {
    const { value, defaultValue, onChange, onBlur, disabled, id, name, min, max, placeholder, ...rest } = props;
    const dateValue = typeof value === 'string' ? value : typeof defaultValue === 'string' ? defaultValue : undefined;
    return (
      <DatePicker
        // `DatePicker` é um botão (abre um popover), não um <input> — o ref
        // de `register()`/forms serve só para foco/validação imperativa, que
        // não se aplica aqui; o cast documenta essa troca de elemento.
        ref={ref as unknown as React.Ref<HTMLButtonElement>}
        id={id}
        name={name}
        value={dateValue}
        onChange={(next) => onChange?.({ target: { value: next, name, id, type: 'date' } } as unknown as React.ChangeEvent<HTMLInputElement>)}
        onBlur={onBlur ? () => onBlur({ target: { value: dateValue, name, id } } as unknown as React.FocusEvent<HTMLInputElement>) : undefined}
        disabled={disabled}
        min={typeof min === 'string' ? min : undefined}
        max={typeof max === 'string' ? max : undefined}
        placeholder={placeholder}
        className={className}
        {...rest}
      />
    );
  }

  return <input type={type} className={cn(INPUT_CLASSNAME, className)} ref={ref} {...props} />;
});
Input.displayName = 'Input';

export { Input };
