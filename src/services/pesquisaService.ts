import { supabase } from '@/integrations/supabase/client';
import type { Insertable, Tables, Updatable } from '@/integrations/supabase/database.types';

export const pesquisaService = {
  async listar(empresaId: string): Promise<Tables<'pesquisas'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('pesquisas').select('*').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async criar(d: Insertable<'pesquisas'>): Promise<Tables<'pesquisas'>> {
    const { data, error } = await supabase.from('pesquisas').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de pesquisa foi retornado.');
    return data;
  },

  async atualizar(id: string, d: Updatable<'pesquisas'>, empresaId: string): Promise<Tables<'pesquisas'>> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('pesquisas')
      .update(d)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de pesquisa foi retornado.');
    return data;
  },

  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('pesquisas').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  async listarPerguntas(pesquisaId: string): Promise<Tables<'pesquisas_perguntas'>[]> {
    const { data, error } = await supabase
      .from('pesquisas_perguntas')
      .select('*')
      .eq('pesquisa_id', pesquisaId)
      .order('ordem');
    if (error) throw error;
    return data || [];
  },

  async criarPergunta(d: Insertable<'pesquisas_perguntas'>): Promise<Tables<'pesquisas_perguntas'>> {
    const { data, error } = await supabase.from('pesquisas_perguntas').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de pergunta foi retornado.');
    return data;
  },

  async excluirPergunta(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    // Cross-tenant ownership check via parent pesquisa — fail closed if record not found
    const { data: perg } = await supabase.from('pesquisas_perguntas').select('pesquisa_id').eq('id', id).maybeSingle();
    if (!perg?.pesquisa_id) throw new Error('Pergunta não encontrada');
    const { data: pesq } = await supabase
      .from('pesquisas')
      .select('empresa_id')
      .eq('id', perg.pesquisa_id)
      .maybeSingle();
    if (!pesq || pesq.empresa_id !== empresaId) throw new Error('Acesso negado: pergunta pertence a outro tenant');
    const { error } = await supabase
      .from('pesquisas_perguntas')
      .delete()
      .eq('id', id)
      .eq('pesquisa_id', perg.pesquisa_id);
    if (error) throw error;
  },

  async enviarResposta(d: Insertable<'pesquisas_respostas'>): Promise<Tables<'pesquisas_respostas'>> {
    const { data, error } = await supabase.from('pesquisas_respostas').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de resposta foi retornado.');
    return data;
  },

  async listarRespostas(pesquisaId: string): Promise<Tables<'pesquisas_respostas'>[]> {
    const { data, error } = await supabase.from('pesquisas_respostas').select('*').eq('pesquisa_id', pesquisaId);
    if (error) throw error;
    return data || [];
  },
};
