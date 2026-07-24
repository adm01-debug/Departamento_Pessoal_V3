import { supabase } from '@/integrations/supabase/client';

export const avaliacaoService = {
  // === Ciclos ===
  async listarCiclos(empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase.from('ciclos_avaliacao').select('*').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async criarCiclo(d: any) {
    const { data, error } = await supabase.from('ciclos_avaliacao').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async excluirCiclo(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('ciclos_avaliacao').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // === Metas ===
  async listarMetas(empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase.from('metas_okrs').select('*, colaborador:colaboradores(nome_completo)').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async criarMeta(d: any) {
    const { data, error } = await supabase.from('metas_okrs').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async excluirMeta(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('metas_okrs').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // === PDIs ===
  async listarPDIs(empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase.from('pdi_plano_desenvolvimento').select('*, colaborador:colaboradores(nome_completo)').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async criarPDI(d: any) {
    const { data, error } = await supabase.from('pdi_plano_desenvolvimento').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async excluirPDI(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('pdi_plano_desenvolvimento').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // === Feedbacks ===
  async listarFeedbacks(empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase.from('feedbacks_360').select(`
      *,
      avaliado:colaboradores!feedbacks_360_avaliado_id_fkey(nome_completo),
      avaliador:colaboradores!feedbacks_360_avaliador_id_fkey(nome_completo)
    `).order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async criarFeedback(d: any) {
    const { data, error } = await supabase.from('feedbacks_360').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async excluirFeedback(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('feedbacks_360').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // === Competências ===
  async listarCompetencias(empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase.from('competencias_config').select('*').order('nome');
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async criarCompetencia(d: any) {
    const { data, error } = await supabase.from('competencias_config').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async excluirCompetencia(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('competencias_config').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
};
