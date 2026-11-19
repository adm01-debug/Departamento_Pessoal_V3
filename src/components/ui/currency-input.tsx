// V15-188: src/components/ui/currency-input.tsx
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface CurrencyInputProps {
  value?: number;
  onChange?: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^\d]/g, '');
  return parseInt(cleaned || '0', 10) / 100;
};

export function CurrencyInput({ value: controlledValue, onChange, placeholder = 'R$ 0,00', className, disabled }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(controlledValue !== undefined ? formatCurrency(controlledValue) : '');
  const [lastControlled, setLastControlled] = useState(controlledValue);

  // Sincroniza com a prop controlada durante o render (sem useEffect/setState-in-effect).
  if (controlledValue !== lastControlled) {
    setLastControlled(controlledValue);
    if (controlledValue !== undefined) setDisplayValue(formatCurrency(controlledValue));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numericValue = parseCurrency(raw);
    setDisplayValue(formatCurrency(numericValue));
    onChange?.(numericValue);
  };

  return (
    <Input
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      inputMode="numeric"
      className={cn('text-right', className)}
      disabled={disabled}
    />
  );
}
