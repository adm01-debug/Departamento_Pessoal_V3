// V15-188: src/components/ui/currency-input.tsx
import { useState, type HTMLAttributes } from 'react';
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
  /**
   * `inputMode` do `<input>` interno. Opcional e sem default: omitido, o
   * atributo simplesmente não é renderizado e nada muda para os usos
   * existentes. Usado pela Calculadora de Rescisão, cujos campos monetários
   * precisam se anunciar como numéricos (teclado numérico no mobile e
   * seletores `input[inputmode="numeric"]`).
   */
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
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

export function CurrencyInput({
  value: controlledValue,
  onChange,
  placeholder = 'R$ 0,00',
  className,
  disabled,
  showPrefix,
  inputMode,
}: CurrencyInputProps) {
  const format = showPrefix ? formatAmount : formatCurrency;
  const [displayValue, setDisplayValue] = useState(controlledValue !== undefined ? format(controlledValue) : '');
  const [lastControlled, setLastControlled] = useState(controlledValue);

  // Sincroniza com a prop controlada durante o render (sem useEffect/setState-in-effect).
  if (controlledValue !== lastControlled) {
    setLastControlled(controlledValue);
    // `undefined` significa "campo vazio" (não "componente sem controle"): o
    // display precisa VOLTAR ao placeholder, e não manter o último valor
    // formatado — é o que um reset de formulário (ex.: "Limpar dados" da
    // Calculadora de Rescisão) espera. Antes, o valor antigo ficava na tela
    // mesmo com o pai já zerado.
    setDisplayValue(controlledValue !== undefined ? format(controlledValue) : '');
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
        inputMode={inputMode}
      />
    );
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
        R$
      </span>
      <Input
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder.replace('R$ ', '')}
        className={cn('pl-9 text-left', className)}
        disabled={disabled}
        inputMode={inputMode}
      />
    </div>
  );
}
