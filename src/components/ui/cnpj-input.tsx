import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Button } from './button';
import { Loader2, Search, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  capital_social: number;
}

interface CNPJInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onValidate?: (valid: boolean) => void;
  onCompanyFound?: (data: CNPJData) => void;
  className?: string;
  disabled?: boolean;
}

const formatCNPJ = (value: string): string => {
  const cleaned = value.replace(/\D/g, '').slice(0, 14);
  return cleaned.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})/, '$1-$2');
};

const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14 || /^(\d)\1+$/.test(cleaned)) return false;
  const calc = (x: number) => {
    const slice = cleaned.slice(0, x);
    let factor = x - 7, sum = 0;
    for (let i = x; i >= 1; i--) { sum += parseInt(slice[x - i]) * factor--; if (factor < 2) factor = 9; }
    const result = 11 - (sum % 11);
    return result > 9 ? 0 : result;
  };
  return calc(12) === parseInt(cleaned[12]) && calc(13) === parseInt(cleaned[13]);
};

export function CNPJInput({ value: controlledValue, onChange, onValidate, onCompanyFound, className, disabled }: CNPJInputProps) {
  const [displayValue, setDisplayValue] = useState(controlledValue ? formatCNPJ(controlledValue) : '');
  const [lastControlled, setLastControlled] = useState(controlledValue);
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState(false);
  const { toast } = useToast();

  // Sincroniza com a prop controlada durante o render (sem useEffect/setState-in-effect).
  if (controlledValue !== lastControlled) {
    setLastControlled(controlledValue);
    if (controlledValue) setDisplayValue(formatCNPJ(controlledValue));
  }

  const searchCNPJ = async () => {
    const raw = displayValue.replace(/\D/g, '');
    if (raw.length !== 14 || !validateCNPJ(raw)) {
      toast({ title: 'CNPJ inválido', description: 'Verifique o número informado', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setFound(false);
    try {
      const { data, error } = await supabase.functions.invoke('consultarCNPJ', {
        body: { cnpj: raw },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'CNPJ não encontrado', description: data.error, variant: 'destructive' });
        return;
      }
      setFound(true);
      onCompanyFound?.(data);
      toast({ title: 'Empresa encontrada', description: data.razao_social });
    } catch {
      toast({ title: 'Erro ao consultar CNPJ', description: 'Tente novamente', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setDisplayValue(formatted);
    setFound(false);
    const raw = e.target.value.replace(/\D/g, '');
    onChange?.(raw);
    if (raw.length === 14) onValidate?.(validateCNPJ(raw));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchCNPJ();
    }
  };

  return (
    <div className="flex gap-2">
      <Input value={displayValue} onChange={handleChange} onKeyDown={handleKeyDown} placeholder="00.000.000/0000-00" className={cn(found && 'border-green-500', className)} disabled={disabled} maxLength={18} />
      <Button type="button" variant="outline" size="icon" onClick={searchCNPJ} disabled={disabled || loading || displayValue.replace(/\D/g, '').length !== 14} aria-label="Buscar CNPJ">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : found ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Search className="h-4 w-4" />}
      </Button>
    </div>
  );
}
