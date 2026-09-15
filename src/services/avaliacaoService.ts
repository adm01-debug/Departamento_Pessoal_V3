import { supabase } from '@/integrations/supabase/client';
import type { Tables, Insertable } from '@/integrations/supabase/database.types';

type ComColaborador = { colaborador: Pick<Tables<'colaboradores'>, 'nome_completo'> | null };
type ComAvaliadoAvaliador = {
  avaliado: Pick<Tables<'colaboradores'>, 'nome_completo'> | null;
  avaliador: Pick<Tables<'colaboradores'>, 'nome_completo'> | null;
};

export const avaliacaoService = {
  // === Ciclos ===
  async listarCiclos(empresaId: string): Promise<Tables<'ciclos_avaliacao'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase.from('ciclos_avaliacao').select('*').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async criarCiclo(d: Insertable<'ciclos_avaliacao'>): Promise<Tables<'ciclos_avaliacao'> | null> {
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
  async listarMetas(empresaId: string): Promise<(Tables<'metas_okrs'> & ComColaborador)[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase
      .from('metas_okrs')
      .select('*, colaborador:colaboradores(nome_completo)')
      .order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as (Tables<'metas_okrs'> & ComColaborador)[]) || [];
  },
  async criarMeta(d: Insertable<'metas_okrs'>): Promise<Tables<'metas_okrs'> | null> {
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
  async listarPDIs(empresaId: string): Promise<(Tables<'pdi_plano_desenvolvimento'> & ComColaborador)[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase
      .from('pdi_plano_desenvolvimento')
      .select('*, colaborador:colaboradores(nome_completo)')
      .order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as (Tables<'pdi_plano_desenvolvimento'> & ComColaborador)[]) || [];
  },
  async criarPDI(d: Insertable<'pdi_plano_desenvolvimento'>): Promise<Tables<'pdi_plano_desenvolvimento'> | null> {
    const { data, error } = await supabase.from('pdi_plano_desenvolvimento').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async excluirPDI(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase
      .from('pdi_plano_desenvolvimento')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // === Feedbacks ===
  async listarFeedbacks(empresaId: string): Promise<(Tables<'feedbacks_360'> & ComAvaliadoAvaliador)[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase
      .from('feedbacks_360')
      .select(
        `
      *,
      avaliado:colaboradores!feedbacks_360_avaliado_id_fkey(nome_completo),
      avaliador:colaboradores!feedbacks_360_avaliador_id_fkey(nome_completo)
    `
      )
      .order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as (Tables<'feedbacks_360'> & ComAvaliadoAvaliador)[]) || [];
  },
  async criarFeedback(d: Insertable<'feedbacks_360'>): Promise<Tables<'feedbacks_360'> | null> {
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
  async listarCompetencias(empresaId: string): Promise<Tables<'competencias_config'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase.from('competencias_config').select('*').order('nome');
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async criarCompetencia(d: Insertable<'competencias_config'>): Promise<Tables<'competencias_config'> | null> {
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
