import { supabase, type QueryBuilderType } from '@/integrations/supabase/client';
import type { Insertable, Tables, Updatable } from '@/integrations/supabase/database.types';
import { validateInput, validateTablePayload } from '@/schemas/validate';
import { cursoSchema, trilhaSchema, inscricaoCursoSchema } from '@/schemas/cursos';

/** Linha de trilhas_cursos com o join `curso` retornado por `listarTrilhasCursos`. */
export type InscricaoComJoins = Tables<'inscricoes_cursos'> & {
  colaborador: Pick<Tables<'colaboradores'>, 'nome_completo'> | null;
  curso: Pick<Tables<'catalogo_cursos'>, 'nome'> | null;
};

export type CertificadoComJoins = Tables<'treinamento_certificados'> & {
  colaborador: Pick<Tables<'colaboradores'>, 'nome_completo'> | null;
  curso: Pick<Tables<'catalogo_cursos'>, 'nome' | 'carga_horaria'> | null;
};

export type TrilhaCursoComCurso = Tables<'trilhas_cursos'> & {
  curso: Pick<Tables<'catalogo_cursos'>, 'id' | 'nome' | 'carga_horaria'> | null;
};

/** Instância com os joins `curso` e `instrutor` retornados por `listarInstancias`. */
export type InstanciaComJoins = Tables<'treinamento_instancias'> & {
  curso: Pick<Tables<'catalogo_cursos'>, 'nome'> | null;
  instrutor: Pick<Tables<'colaboradores'>, 'nome_completo'> | null;
};

const ensure = <T>(d: T | null, e: string): T => {
  if (!d) throw new Error(`Nenhum registro de ${e} retornado.`);
  return d;
};

export const catalogoCursoService = {
  async listarCursos(empresaId: string): Promise<Tables<'catalogo_cursos'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('catalogo_cursos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');
    if (error) throw error;
    return (data as Tables<'catalogo_cursos'>[] | null) || [];
  },
  async criarCurso(d: Insertable<'catalogo_cursos'>): Promise<Tables<'catalogo_cursos'>> {
    if (!d.empresa_id) throw new Error('empresa_id obrigatório');
    validateInput(cursoSchema, d, 'catalogo.criarCurso');
    const { data, error } = await supabase
      .from('catalogo_cursos')
      .insert(validateTablePayload('catalogo_cursos', d, 'catalogoCursoService:catalogo_cursos'))
      .select()
      .maybeSingle();
    if (error) throw error;
    return ensure(data, 'curso');
  },
  async atualizarCurso(
    id: string,
    d: Updatable<'catalogo_cursos'>,
    empresaId: string
  ): Promise<Tables<'catalogo_cursos'>> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    validateInput(cursoSchema, d, 'catalogo.atualizarCurso');
    const { data, error } = await supabase
      .from('catalogo_cursos')
      .update(validateTablePayload('catalogo_cursos', d, 'catalogoCursoService:catalogo_cursos'))
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return ensure(data, 'curso');
  },
  async excluirCurso(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('catalogo_cursos').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
  async listarTrilhas(empresaId: string): Promise<Tables<'trilhas_aprendizado'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('trilhas_aprendizado')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');
    if (error) throw error;
    return (data as Tables<'trilhas_aprendizado'>[] | null) || [];
  },
  async criarTrilha(d: Insertable<'trilhas_aprendizado'>): Promise<Tables<'trilhas_aprendizado'>> {
    if (!d.empresa_id) throw new Error('empresa_id obrigatório');
    validateInput(trilhaSchema, d, 'catalogo.criarTrilha');
    const { data, error } = await supabase
      .from('trilhas_aprendizado')
      .insert(validateTablePayload('trilhas_aprendizado', d, 'catalogoCursoService:trilhas_aprendizado'))
      .select()
      .maybeSingle();
    if (error) throw error;
    return ensure(data, 'trilha');
  },
  async excluirTrilha(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('trilhas_aprendizado').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
  async listarInscricoes(empresaId: string, cursoId?: string): Promise<InscricaoComJoins[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase
      .from('inscricoes_cursos')
      .select('*, colaborador:colaboradores(nome_completo), curso:catalogo_cursos(nome)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (cursoId) q = q.eq('curso_id', cursoId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as InscricaoComJoins[] | null) || [];
  },
  async criarInscricao(d: Insertable<'inscricoes_cursos'>): Promise<Tables<'inscricoes_cursos'>> {
    if (!d.empresa_id) throw new Error('empresa_id obrigatório');
    validateInput(inscricaoCursoSchema, d, 'catalogo.criarInscricao');
    const { data, error } = await supabase
      .from('inscricoes_cursos')
      .insert(validateTablePayload('inscricoes_cursos', d, 'catalogoCursoService:inscricoes_cursos'))
      .select()
      .maybeSingle();
    if (error) throw error;
    return ensure(data, 'inscrição');
  },
  async atualizarInscricao(
    id: string,
    d: Updatable<'inscricoes_cursos'>,
    empresaId: string
  ): Promise<Tables<'inscricoes_cursos'>> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    validateInput(inscricaoCursoSchema, d, 'catalogo.atualizarInscricao');
    const { data, error } = await supabase
      .from('inscricoes_cursos')
      .update(validateTablePayload('inscricoes_cursos', d, 'catalogoCursoService:inscricoes_cursos'))
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return ensure(data, 'inscrição');
  },

  async listarTrilhasCursos(trilhaId: string): Promise<TrilhaCursoComCurso[]> {
    const { data, error } = await supabase
      .from('trilhas_cursos')
      .select('*, curso:catalogo_cursos(id, nome, carga_horaria)')
      .eq('trilha_id', trilhaId)
      .order('ordem');
    if (error) throw error;
    return (data as TrilhaCursoComCurso[] | null) || [];
  },
  async vincularCursoTrilha(d: {
    trilha_id: string;
    curso_id: string;
    ordem?: number;
    obrigatorio?: boolean;
  }): Promise<Tables<'trilhas_cursos'> | null> {
    const { data, error } = await supabase
      .from('trilhas_cursos')
      .insert(validateTablePayload('trilhas_cursos', d, 'catalogoCursoService:trilhas_cursos'))
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async desvincularCursoTrilha(id: string, trilhaId: string): Promise<void> {
    if (!trilhaId) throw new Error('trilha_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('trilhas_cursos').delete().eq('id', id).eq('trilha_id', trilhaId);
    if (error) throw error;
  },

  // `treinamento_instancias` não tem empresa_id direto — o isolamento de
  // tenant é feito pela RLS via curso_id → catalogo_cursos.empresa_id
  // (migration 20260724001500_fix_treinamento_rls_cross_tenant.sql). O
  // `.eq('empresa_id', ...)` que existia aqui antes referenciava uma
  // coluna inexistente: sob a tipagem antiga genérica compilava, mas o
  // PostgREST recusaria a query em runtime — e esta função É chamada de
  // verdade por TreinamentosPage.tsx, então a página quebraria ao carregar
  // instâncias. RLS já garante o isolamento; não há filtro de aplicação
  // correspondente a repor.
  async listarInstancias(cursoId?: string): Promise<InstanciaComJoins[]> {
    let q = supabase
      .from('treinamento_instancias')
      .select(
        '*, curso:catalogo_cursos!treinamento_instancias_curso_id_fkey(nome), instrutor:colaboradores!treinamento_instancias_instrutor_id_fkey(nome_completo)'
      )
      .order('data_inicio', { ascending: true });
    if (cursoId) q = q.eq('curso_id', cursoId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as InstanciaComJoins[] | null) || [];
  },
  async criarInstancia(d: Insertable<'treinamento_instancias'>): Promise<Tables<'treinamento_instancias'> | null> {
    const { data, error } = await supabase
      .from('treinamento_instancias')
      .insert(validateTablePayload('treinamento_instancias', d, 'catalogoCursoService:treinamento_instancias'))
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async atualizarInstancia(
    id: string,
    d: Updatable<'treinamento_instancias'>
  ): Promise<Tables<'treinamento_instancias'> | null> {
    const { data, error } = await supabase
      .from('treinamento_instancias')
      .update(validateTablePayload('treinamento_instancias', d, 'catalogoCursoService:treinamento_instancias'))
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async registrarFeedback(d: {
    inscricao_id: string;
    nota_satisfacao: number;
    comentario?: string;
    aplicabilidade_nota?: number;
  }): Promise<Tables<'treinamento_feedback'> | null> {
    const { data, error } = await supabase
      .from('treinamento_feedback')
      .insert(validateTablePayload('treinamento_feedback', d, 'catalogoCursoService:treinamento_feedback'))
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // SEGURANÇA (achado ao eliminar casts genéricos desta função, não corrigido aqui):
  // `treinamento_certificados` não tem empresa_id direto, e a RLS em
  // 20260513193156_...sql ("RH e Gestores veem todos os certificados")
  // NÃO tem escopo de tenant — qualquer usuário com role admin/rh/gestor
  // de QUALQUER empresa pode ler certificados de TODAS as empresas via
  // RLS. Nenhuma migration posterior corrige isso. Isso precisa de uma
  // migration própria (padrão da 20260724001500_fix_treinamento_rls_cross_tenant.sql,
  // que já corrigiu o mesmo problema em treinamento_instancias/feedback) —
  // fora do escopo desta etapa de tipagem. O filtro abaixo via curso_id é
  // defesa em profundidade na aplicação, não substitui a correção de RLS.
  //
  // O `.eq('empresa_id', ...)` que existia aqui antes referenciava uma
  // coluna inexistente; sob a tipagem genérica anterior compilava, mas a página de treinamentos
  // (TreinamentosPage.tsx) que chama isto de verdade sempre falharia ao
  // carregar certificados.
  async listarCertificados(empresaId: string, colaboradorId?: string): Promise<CertificadoComJoins[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const cursoIdsQuery = await supabase.from('catalogo_cursos').select('id').eq('empresa_id', empresaId);
    if (cursoIdsQuery.error) throw cursoIdsQuery.error;
    const cursoIds = (cursoIdsQuery.data ?? []).map((c) => c.id);
    if (cursoIds.length === 0) return [];

    let q = (
      supabase
        .from('treinamento_certificados')
        .select(
          '*, curso:catalogo_cursos(nome, carga_horaria), colaborador:colaboradores(nome_completo)'
        ) as unknown as QueryBuilderType
    ).in('curso_id', cursoIds);
    if (colaboradorId) q = q.eq('colaborador_id', colaboradorId);
    const { data, error } = await q.order('data_emissao', { ascending: false });
    if (error) throw error;
    return (data as CertificadoComJoins[] | null) || [];
  },

  async getCertificado(id: string): Promise<Tables<'treinamento_certificados'>> {
    const { data, error } = await supabase
      .from('treinamento_certificados')
      .select('*, curso:catalogo_cursos(*), colaborador:colaboradores(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Tables<'treinamento_certificados'>;
  },
};
