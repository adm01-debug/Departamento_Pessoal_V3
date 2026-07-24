// V15-187: src/components/ui/search-input.tsx
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Button } from './button';
import { Search, X, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  debounce?: number;
  loading?: boolean;
  className?: string;
}

export function SearchInput({ value: controlledValue, onChange, onSearch, placeholder = 'Buscar...', debounce = 300, loading = false, className }: SearchInputProps) {
  const [value, setValue] = useState(controlledValue || '');
  const debouncedValue = useDebounce(value, debounce);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (controlledValue !== undefined) setValue(controlledValue);
  }, [controlledValue]);

  useEffect(() => {
    onSearch?.(debouncedValue);
  }, [debouncedValue, onSearch]);

  const handleChange = (v: string) => {
    setValue(v);
    onChange?.(v);
  };

  const clear = () => {
    setValue('');
    onChange?.('');
    onSearch?.('');
  };

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input value={value} onChange={(e) => handleChange(e.target.value)} placeholder={placeholder} className="pl-9 pr-9" />
      {loading ? (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      ) : value && (
        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={clear} aria-label="Limpar pesquisa">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
