// V15-198: src/components/forms/FormField.tsx
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { forwardRef } from 'react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, description, required, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center gap-0.5">
            <Label htmlFor={inputId} className={cn(error && 'text-destructive')}>{label}</Label>
            {/* `text-sm leading-none` casa exatamente com as classes do <Label>
                (ui/label.tsx) — sem isso, a `<span>` (sem leading próprio) herda
                a altura de linha padrão do texto, mais alta que `leading-none`,
                e deixa a linha do rótulo mais alta só nos campos obrigatórios,
                desalinhando o input em relação aos campos vizinhos na mesma
                grade que não têm asterisco. */}
            {required && <span className="text-destructive text-sm leading-none" aria-hidden="true">*</span>}
          </div>
        )}
        <Input ref={ref} id={inputId} required={required} className={cn(error && 'border-destructive', className)} {...props} />
        {description && !error && <p className="text-sm text-muted-foreground">{description}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
