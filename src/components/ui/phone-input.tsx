// V15-189: src/components/ui/phone-input.tsx
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Ícone opcional exibido dentro do campo (ex.: indicador de WhatsApp). */
  icon?: ReactNode;
}

const formatPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
};

export function PhoneInput({ value: controlledValue, onChange, placeholder = '(00) 00000-0000', className, disabled, icon }: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState(controlledValue ? formatPhone(controlledValue) : '');
  const [lastControlled, setLastControlled] = useState(controlledValue);

  // Sincroniza com a prop controlada durante o render (sem useEffect/setState-in-effect).
  if (controlledValue !== lastControlled) {
    setLastControlled(controlledValue);
    if (controlledValue) setDisplayValue(formatPhone(controlledValue));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setDisplayValue(formatted);
    onChange?.(e.target.value.replace(/\D/g, ''));
  };

  if (!icon) {
    return <Input value={displayValue} onChange={handleChange} placeholder={placeholder} className={cn(className)} disabled={disabled} />;
  }

  return (
    <div className="relative">
      <Input value={displayValue} onChange={handleChange} placeholder={placeholder} className={cn('pr-9', className)} disabled={disabled} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">{icon}</span>
    </div>
  );
}
