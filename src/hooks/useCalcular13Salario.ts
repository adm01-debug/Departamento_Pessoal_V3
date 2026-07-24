import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

interface Dados13Salario {
  colaboradorId: string;
  salario: number;
  mediaVariaveis: number;
  dataAdmissao: string;
  anoReferencia: number;
  parcela: 1 | 2;
  mesesAfastamento: number;
  dependentesIRRF: number;
  pensaoAlimenticia: number;
}

interface Resultado13Salario {
  colaboradorId: string;
  anoReferencia: number;
  parcela: number;
  avos: number;
  proventos: {
    salarioBase: number;
    mediaVariaveis: number;
    valorBruto: number;
    valorParcela: number;
  };
  descontos: {
    inss: number;
    irrf: number;
    pensaoAlimenticia: number;
    adiantamento1Parcela: number;
    totalDescontos: number;
  };
  liquido: number;
  dataLimitePagamento: string;
}

export function useCalcular13Salario() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado13Salario | null>(null);

  const calcular = async (dados: Dados13Salario) => {
    setLoading(true);
    setResultado(null);
    try {
      const { data, error } = await supabase.functions.invoke('calcular-13-salario', {
        body: dados,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro no cálculo');
      setResultado(data.resultado);
      toast.success(`13º Salário (${dados.parcela}ª parcela) calculado!`);
      return data.resultado;
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro ao calcular 13º salário.'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { calcular, loading, resultado };
}

export type { Dados13Salario, Resultado13Salario };
