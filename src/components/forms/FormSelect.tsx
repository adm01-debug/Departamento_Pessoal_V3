// V15-199: src/components/forms/FormSelect.tsx
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps {
  label?: string;
  error?: string;
  description?: string;
  placeholder?: string;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  /**
   * Por padrão (`undefined`, comportamento nativo do Radix) o menu pode
   * abrir pra cima quando falta espaço abaixo do trigger. Passe `false`
   * quando o campo precisa abrir sempre pra baixo mesmo perto do fim da
   * viewport (ex.: campo no meio de um card longo, onde abrir pra cima
   * cobriria o cabeçalho da página).
   */
  avoidCollisions?: boolean;
}

export function FormSelect({ label, error, description, placeholder = 'Selecione...', options, value, onChange, disabled, className, required, avoidCollisions }: FormSelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center gap-0.5">
          <Label className={cn(error && 'text-destructive')}>{label}</Label>
          {required && <span className="text-destructive text-sm leading-none" aria-hidden="true">*</span>}
        </div>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn(error && 'border-destructive', className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent avoidCollisions={avoidCollisions}>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && !error && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
