import { supabase } from '@/integrations/supabase/client';
export const lgpdService = {
  async listarConsentimentos(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('lgpd_consentimentos').select('*, colaborador:colaboradores(nome_completo)').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },

  async criarConsentimento(d: any): Promise<any> {
    const { data, error } = await supabase.from('lgpd_consentimentos').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de consentimento foi retornado.');
    return data;
  },
  
  async revogarConsentimento(id: string, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('lgpd_consentimentos').update({ aceito: false, revogado_em: new Date().toISOString() }).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de consentimento foi retornado.');
    return data;

  },
  
  async listarSolicitacoes(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('lgpd_solicitacoes').select('*, colaborador:colaboradores(nome_completo)').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },

  async criarSolicitacao(d: any): Promise<any> {
    const { data, error } = await supabase.from('lgpd_solicitacoes').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de solicitação LGPD foi retornado.');
    return data;
  },
  
  async atualizarSolicitacao(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('lgpd_solicitacoes').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de solicitação LGPD foi retornado.');
    return data;

  },
};
