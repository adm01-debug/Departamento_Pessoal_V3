import * as React from 'react';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const INPUT_CLASSNAME =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-control file:border-0 file:bg-transparent file:text-control file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Campo de data do app: nunca o `<input type="date">` nativo (calendário claro
 * do SO/navegador, sem tema e diferente em cada browser), sempre o `DatePicker`
 * do Design System.
 *
 * Mantém os DOIS contratos que os call-sites usam hoje:
 *  · CONTROLADO (`value` + `onChange`): o `onChange` recebe um evento sintético
 *    com `.target.value` na string `YYYY-MM-DD`, igual ao input nativo — serve
 *    tanto para `useState` direto quanto para `register()` do react-hook-form.
 *  · NÃO CONTROLADO (só `name`, lido por `new FormData(form)` no submit): o
 *    valor fica em estado interno e é espelhado num `<input type="hidden">` com
 *    o mesmo `name`. Sem esse espelho o campo sairia do `FormData` (um botão só
 *    entra quando é o submitter), e formulários como o de certificado A1 do
 *    e-Social gravariam a vigência vazia.
 */
const DateInput = React.forwardRef<HTMLButtonElement, InputProps>(
  ({ className, value, defaultValue, onChange, onBlur, disabled, id, name, min, max, placeholder, ...rest }, ref) => {
    const controlado = typeof value === 'string';
    const [interno, setInterno] = React.useState(typeof defaultValue === 'string' ? defaultValue : '');
    const atual = controlado ? (value as string) : interno;

    return (
      <>
        <DatePicker
          ref={ref}
          id={id}
          value={atual}
          onChange={(next) => {
            if (!controlado) setInterno(next);
            onChange?.({
              target: { value: next, name, id, type: 'date' },
            } as unknown as React.ChangeEvent<HTMLInputElement>);
          }}
          onBlur={
            onBlur
              ? () => onBlur({ target: { value: atual, name, id } } as unknown as React.FocusEvent<HTMLInputElement>)
              : undefined
          }
          disabled={disabled}
          min={typeof min === 'string' ? min : undefined}
          max={typeof max === 'string' ? max : undefined}
          placeholder={placeholder}
          className={className}
          {...rest}
        />
        {name ? <input type="hidden" name={name} value={atual} /> : null}
      </>
    );
  }
);
DateInput.displayName = 'DateInput';

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  if (type === 'date') {
    // `DatePicker` é um botão (abre um popover), não um `<input>`; o ref dos
    // call-sites/`register()` serve só para foco imperativo, que continua
    // funcionando no botão — o cast documenta a troca de elemento.
    return <DateInput ref={ref as unknown as React.Ref<HTMLButtonElement>} className={className} {...props} />;
  }

  return <input type={type} className={cn(INPUT_CLASSNAME, className)} ref={ref} {...props} />;
});
Input.displayName = 'Input';

export { Input };
