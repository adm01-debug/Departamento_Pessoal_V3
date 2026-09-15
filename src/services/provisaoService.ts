import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/database.types';

type ProvisaoComColaborador = Tables<'provisoes_mensais'> & {
  colaborador: Pick<Tables<'colaboradores'>, 'nome_completo' | 'salario_base'> | null;
};

interface CalcularProvisoesResult {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  empresa_id?: string;
  competencia?: string;
  total_colaboradores?: number;
  total_principal?: number;
  total_encargos?: number;
  total_provisionado?: number;
  calculado_em?: string;
  hash_sha256?: string;
  registros?: number;
}

export const provisaoService = {
  async list(empresaId: string, competencia?: string): Promise<ProvisaoComColaborador[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let query = supabase
      .from('provisoes_mensais')
      .select('*, colaborador:colaboradores(nome_completo, salario_base)')
      .order('competencia', { ascending: false });

    query = query.eq('empresa_id', empresaId);
    if (competencia) query = query.eq('competencia', competencia);

    const { data, error } = await query;
    if (error) throw error;
    return (data as ProvisaoComColaborador[]) || [];
  },

  async calcular(empresaId: string, competencia: string): Promise<CalcularProvisoesResult> {
    const { data, error } = await supabase.functions.invoke<CalcularProvisoesResult>('calcular-provisoes', {
      body: { empresa_id: empresaId, competencia },
    });
    if (error) throw error;
    if (!data) throw new Error('Nenhuma resposta recebida ao calcular provisões.');
    return data;
  },
};
