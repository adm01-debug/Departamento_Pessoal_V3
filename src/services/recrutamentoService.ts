import { supabase } from '@/integrations/supabase/client';
export const recrutamentoService = {
  // ===== VAGAS =====
  async listarVagas(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('vagas').select('*').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },

  async criarVaga(d: Record<string, unknown>): Promise<any> {
    
    const { data, error } = await supabase.from('vagas').insert(d as any).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de vaga foi retornado.');
    return data;
  
  },

  async atualizarVaga(id: string, d: Record<string, unknown>, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('vagas').update(d as any).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de vaga foi retornado.');
    return data;

  },

  async excluirVaga(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('vagas').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

  },

  // ===== CANDIDATOS =====
  async listarCandidatos(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('candidatos').select('*').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },

  async criarCandidato(d: Record<string, unknown>): Promise<any> {
    
    const { data, error } = await supabase.from('candidatos').insert(d as any).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de candidato foi retornado.');
    return data;
  
  },

  async atualizarCandidato(id: string, d: Record<string, unknown>, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('candidatos').update(d as any).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de candidato foi retornado.');
    return data;

  },

  async excluirCandidato(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('candidatos').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

  },

  // ===== CANDIDATURAS =====
  async listarCandidaturas(empresaId: string, vagaId?: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase.from('candidaturas').select('*, candidato:candidatos(*), vaga:vagas(titulo, departamento)').eq('empresa_id', empresaId).order('created_at', { ascending: false });
    if (vagaId) q = q.eq('vaga_id', vagaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },

  async criarCandidatura(d: Record<string, unknown>): Promise<any> {
    
    const { data, error } = await supabase.from('candidaturas').insert(d as any).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de candidatura foi retornado.');
    return data;
  
  },

  async atualizarCandidatura(id: string, d: Record<string, unknown>, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('candidaturas').update(d as any).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de candidatura foi retornado.');
    return data;

  },

  async excluirCandidatura(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('candidaturas').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;

  },

  // ===== TESTES E ENTREVISTAS =====
  async agendarEntrevista(d: Record<string, unknown>): Promise<any> {
    
    const { data, error } = await supabase.from('recrutamento_entrevistas').insert(d as any).select().maybeSingle();
    if (error) throw error;
    return data;
  
  },

  async registrarTeste(d: Record<string, unknown>): Promise<any> {
    
    const { data, error } = await supabase.from('recrutamento_testes').insert(d as any).select().maybeSingle();
    if (error) throw error;
    return data;
  
  },

  async adicionarAnotacao(d: Record<string, unknown>): Promise<any> {
    
    const { data, error } = await supabase.from('recrutamento_anotacoes').insert(d as any).select().maybeSingle();
    if (error) throw error;
    return data;
  
  },
};

