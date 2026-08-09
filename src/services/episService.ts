import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Epi = Tables<'epis'>;
type EpiInsert = TablesInsert<'epis'>;
type EpiUpdate = TablesUpdate<'epis'>;
type EpiEntrega = Tables<'epis_entregas'>;
type EpiEntregaInsert = TablesInsert<'epis_entregas'>;
type EpiEntregaUpdate = TablesUpdate<'epis_entregas'>;

interface EpiEntregaComRelacoes extends EpiEntrega {
  epi: Pick<Epi, 'nome' | 'ca'> | null;
  colaborador: Pick<Tables<'colaboradores'>, 'nome_completo'> | null;
}

export const episService = {
  async listar(empresaId: string): Promise<Epi[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase.from('epis').select('*').order('nome');
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },
  
  async criar(d: EpiInsert): Promise<Epi> {
    
    const { data, error } = await supabase.from('epis').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de EPI foi retornado.');
    return data;
  
  },
  
  async atualizar(id: string, d: EpiUpdate, empresaId: string): Promise<Epi> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('epis').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de EPI foi retornado.');
    return data;

  },

  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('epis').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

  },
};

export const episEntregasService = {
  async listar(empresaId: string): Promise<EpiEntregaComRelacoes[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase.from('epis_entregas').select('*, epi:epis(nome, ca), colaborador:colaboradores(nome_completo)').order('data_entrega', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },
  
  async buscarPorColaborador(colaboradorId: string, empresaId: string): Promise<EpiEntregaComRelacoes[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('epis_entregas').select('*, epi:epis(nome, ca), colaborador:colaboradores(nome_completo)').eq('colaborador_id', colaboradorId).eq('empresa_id', empresaId).order('data_entrega', { ascending: false });
    if (error) throw error;
    return data || [];

  },
  
  async criar(d: EpiEntregaInsert): Promise<EpiEntrega> {
    
    const { data, error } = await supabase.from('epis_entregas').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de entrega de EPI foi retornado.');
    return data;
  
  },
  
  async registrarDevolucao(id: string, dataDevolucao: string, empresaId: string): Promise<EpiEntrega> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('epis_entregas').update({ data_devolucao: dataDevolucao }).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de devolução de EPI foi retornado.');
    return data;

  },

  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('epis_entregas').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

  },
};
