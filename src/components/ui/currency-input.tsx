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
  /** Exibe "R$" como prefixo fixo à esquerda do campo (fora do texto
   *  editável), com o valor alinhado à esquerda logo em seguida — em vez do
   *  padrão (valor formatado com "R$" embutido, alinhado à direita). Opt-in
   *  para não alterar a aparência dos usos existentes (ex.:
   *  RecontratarColaboradorDialog). */
  showPrefix?: boolean;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatAmount = (value: number): string => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^\d]/g, '');
  return parseInt(cleaned || '0', 10) / 100;
};

export function CurrencyInput({ value: controlledValue, onChange, placeholder = 'R$ 0,00', className, disabled, showPrefix }: CurrencyInputProps) {
  const format = showPrefix ? formatAmount : formatCurrency;
  const [displayValue, setDisplayValue] = useState(controlledValue !== undefined ? format(controlledValue) : '');
  const [lastControlled, setLastControlled] = useState(controlledValue);

  // Sincroniza com a prop controlada durante o render (sem useEffect/setState-in-effect).
  if (controlledValue !== lastControlled) {
    setLastControlled(controlledValue);
    if (controlledValue !== undefined) setDisplayValue(format(controlledValue));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numericValue = parseCurrency(raw);
    setDisplayValue(format(numericValue));
    onChange?.(numericValue);
  };

  if (!showPrefix) {
    return (
      <Input
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn('text-right', className)}
        disabled={disabled}
      />
    );
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
      <Input
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder.replace('R$ ', '')}
        className={cn('pl-9 text-left', className)}
        disabled={disabled}
      />
    </div>
  );
}
