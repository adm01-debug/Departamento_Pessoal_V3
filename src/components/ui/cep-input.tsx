import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Button } from './button';
import { Loader2, Search, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

interface CEPInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onAddressFound?: (address: Address) => void;
  className?: string;
  disabled?: boolean;
}

export interface Address {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento?: string;
  ibge?: string;
}

const formatCEP = (value: string): string => {
  const cleaned = value.replace(/\D/g, '').slice(0, 8);
  return cleaned.replace(/(\d{5})(\d)/, '$1-$2');
};

export function CEPInput({ value: controlledValue, onChange, onAddressFound, className, disabled }: CEPInputProps) {
  const [displayValue, setDisplayValue] = useState(controlledValue ? formatCEP(controlledValue) : '');
  const [lastControlled, setLastControlled] = useState(controlledValue);
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState(false);
  const { toast } = useToast();

  // Sincroniza com a prop controlada durante o render (sem useEffect/setState-in-effect).
  if (controlledValue !== lastControlled) {
    setLastControlled(controlledValue);
    if (controlledValue) setDisplayValue(formatCEP(controlledValue));
  }

  const searchCEP = async () => {
    const cep = displayValue.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setLoading(true);
    setFound(false);
    try {
      const { data, error } = await supabase.functions.invoke('consultarCEP', {
        body: { cep },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'CEP não encontrado', description: data.error, variant: 'destructive' });
        return;
      }
      setFound(true);
      onAddressFound?.({
        cep: data.cep,
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        uf: data.uf,
        complemento: data.complemento,
        ibge: data.ibge,
      });
      toast({ title: 'Endereço encontrado', description: `${data.logradouro}, ${data.localidade} - ${data.uf}` });
    } catch {
      toast({ title: 'Erro ao consultar CEP', description: 'Tente novamente', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setDisplayValue(formatted);
    setFound(false);
    onChange?.(e.target.value.replace(/\D/g, ''));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchCEP();
    }
  };

  return (
    <div className="flex gap-2">
      <Input value={displayValue} onChange={handleChange} onKeyDown={handleKeyDown} placeholder="00000-000" className={cn(found && 'border-green-500', className)} disabled={disabled} maxLength={9} />
      <Button type="button" variant="outline" size="icon" onClick={searchCEP} disabled={disabled || loading || displayValue.replace(/\D/g, '').length !== 8} aria-label="Buscar CEP">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : found ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Search className="h-4 w-4" />}
      </Button>
    </div>
  );
}
