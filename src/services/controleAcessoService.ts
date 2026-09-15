import { supabase } from '@/integrations/supabase/client';
import type { Tables, Insertable } from '@/integrations/supabase/database.types';

type ControleAcessoComColaborador = Tables<'controle_acesso'> & {
  colaborador: Pick<Tables<'colaboradores'>, 'nome_completo'> | null;
};

export const controleAcessoService = {
  async listar(empresaId: string): Promise<ControleAcessoComColaborador[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('controle_acesso')
      .select('*, colaborador:colaboradores(nome_completo)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as ControleAcessoComColaborador[]) || [];
  },

  async registrar(d: Insertable<'controle_acesso'>): Promise<Tables<'controle_acesso'>> {
    const { data, error } = await supabase.from('controle_acesso').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de acesso foi retornado.');
    return data;
  },

  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('controle_acesso').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};
