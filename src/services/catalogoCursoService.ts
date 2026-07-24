import { supabase } from '@/integrations/supabase/client';

const ensure = <T>(d: T | null, e: string): T => { if (!d) throw new Error(`Nenhum registro de ${e} retornado.`); return d; };

export const catalogoCursoService = {
  async listarCursos(empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('catalogo_cursos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');
    if (error) throw error;
    return data || [];
  },
  async criarCurso(d: any) {
    if (!d.empresa_id) throw new Error('empresa_id obrigatório');
    const { data, error } = await supabase.from('catalogo_cursos').insert(d).select().maybeSingle();
    if (error) throw error;
    return ensure(data, 'curso');
  },
  async atualizarCurso(id: string, d: any, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('catalogo_cursos').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    return ensure(data, 'curso');
  },
  async excluirCurso(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('catalogo_cursos').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
  async listarTrilhas(empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('trilhas_aprendizado')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('titulo');
    if (error) throw error;
    return data || [];
  },
  async criarTrilha(d: any) {
    if (!d.empresa_id) throw new Error('empresa_id obrigatório');
    const { data, error } = await supabase.from('trilhas_aprendizado').insert(d).select().maybeSingle();
    if (error) throw error;
    return ensure(data, 'trilha');
  },
  async excluirTrilha(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('trilhas_aprendizado').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
  async listarInscricoes(empresaId: string, cursoId?: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase
      .from('inscricoes_cursos')
      .select('*, colaborador:colaboradores(nome_completo), curso:catalogo_cursos(nome)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (cursoId) q = q.eq('curso_id', cursoId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async criarInscricao(d: any) {
    if (!d.empresa_id) throw new Error('empresa_id obrigatório');
    const { data, error } = await supabase.from('inscricoes_cursos').insert(d).select().maybeSingle();
    if (error) throw error;
    return ensure(data, 'inscrição');
  },
  async atualizarInscricao(id: string, d: any, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('inscricoes_cursos').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    return ensure(data, 'inscrição');
  },

  async listarTrilhasCursos(trilhaId: string) {
    const { data, error } = await supabase
      .from('trilhas_cursos')
      .select('*, curso:catalogo_cursos(id, nome, carga_horaria)')
      .eq('trilha_id', trilhaId)
      .order('ordem');
    if (error) throw error;
    return data || [];
  },
  async vincularCursoTrilha(d: { trilha_id: string; curso_id: string; ordem?: number; obrigatorio?: boolean }) {
    const { data, error } = await supabase.from('trilhas_cursos').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async desvincularCursoTrilha(id: string, trilhaId: string) {
    if (!trilhaId) throw new Error('trilha_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('trilhas_cursos').delete().eq('id', id).eq('trilha_id', trilhaId);
    if (error) throw error;
  },

  async listarInstancias(empresaId: string, cursoId?: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (supabase as any)
      .from('treinamento_instancias')
      .select('*, curso:catalogo_cursos!treinamento_instancias_curso_id_fkey(nome), instrutor:colaboradores!treinamento_instancias_instrutor_id_fkey(nome_completo)')
      .eq('empresa_id', empresaId)
      .order('data_inicio', { ascending: true });
    if (cursoId) q = q.eq('curso_id', cursoId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async criarInstancia(d: any) {
    if (!d.empresa_id) throw new Error('empresa_id obrigatório');
    const { data, error } = await supabase.from('treinamento_instancias').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async atualizarInstancia(id: string, d: any, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any).from('treinamento_instancias').update(d).eq('id', id).eq('empresa_id', empresaId).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  async registrarFeedback(d: { inscricao_id: string; nota_satisfacao: number; comentario?: string; aplicabilidade_nota?: number }) {
    const { data, error } = await supabase.from('treinamento_feedback').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  async listarCertificados(empresaId: string, colaboradorId?: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (supabase as any)
      .from('treinamento_certificados')
      .select('*, curso:catalogo_cursos(nome, carga_horaria), colaborador:colaboradores(nome_completo)')
      .eq('empresa_id', empresaId);
    if (colaboradorId) q = q.eq('colaborador_id', colaboradorId);
    const { data, error } = await q.order('data_emissao', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getCertificado(id: string) {
    const { data, error } = await supabase
      .from('treinamento_certificados')
      .select('*, curso:catalogo_cursos(*), colaborador:colaboradores(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
};
