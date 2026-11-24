import { supabase } from '@/integrations/supabase/client';
// MOCK VISUAL — ver src/mocks/treinamentosMock.ts.
import { getMockTrilhasCursos } from '@/mocks/treinamentosMock';

const ensure = <T>(d: T | null, e: string): T => {
  if (!d) throw new Error(`Nenhum registro de ${e} retornado.`);
  return d;
};

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
    const { data, error } = await supabase
      .from('catalogo_cursos')
      .update(d)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return ensure(data, 'curso');
  },
  async excluirCurso(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('catalogo_cursos').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },
  /**
   * Lista as trilhas da empresa.
   *
   * O schema efetivo (`src/integrations/supabase/types.ts` +
   * `20260315212539_*`) usa `nome`; `titulo` não existe em
   * `trilhas_aprendizado`. Ordenar por coluna inexistente derruba a consulta
   * inteira — por isso `order('nome')`.
   */
  async listarTrilhas(empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('trilhas_aprendizado')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');
    if (error) throw error;
    return data || [];
  },
  /**
   * Cria uma trilha.
   *
   * Compatibilidade: o formulário do Hub envia `titulo` (nome do campo na UI),
   * mas a coluna real chama-se `nome`. Normalizamos aqui — a interface do
   * formulário aprovado não muda — e enviamos APENAS colunas existentes.
   */
  async criarTrilha(d: any) {
    if (!d?.empresa_id) throw new Error('empresa_id obrigatório');
    const nome = String(d.nome ?? d.titulo ?? '').trim();
    if (!nome) throw new Error('nome da trilha obrigatório');
    const registro: {
      empresa_id: string;
      nome: string;
      descricao?: string | null;
      nivel?: string | null;
      ativo?: boolean | null;
    } = { empresa_id: d.empresa_id, nome };
    if (d.descricao !== undefined) registro.descricao = d.descricao;
    if (d.nivel !== undefined) registro.nivel = d.nivel;
    if (d.ativo !== undefined) registro.ativo = d.ativo;
    const { data, error } = await supabase.from('trilhas_aprendizado').insert(registro).select().maybeSingle();
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
      .select(
        '*, colaborador:colaboradores(nome_completo, foto_url, cargo, departamento), curso:catalogo_cursos(nome, categoria)'
      )
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
    const { data, error } = await supabase
      .from('inscricoes_cursos')
      .update(d)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return ensure(data, 'inscrição');
  },

  async listarTrilhasCursos(trilhaId: string) {
    // MOCK VISUAL — ver src/mocks/treinamentosMock.ts. `[]` (trilha sem cursos)
    // é truthy, então curto-circuita também nesse caso.
    const mock = getMockTrilhasCursos(trilhaId);
    if (mock) return mock;
    const { data, error } = await supabase
      .from('trilhas_cursos')
      .select('*, curso:catalogo_cursos(id, nome, carga_horaria, modalidade)')
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

  /**
   * Instâncias (turmas) da empresa.
   *
   * `treinamento_instancias` NÃO possui `empresa_id` — o escopo real é o CURSO
   * (`curso_id → catalogo_cursos.empresa_id`), como já definido na policy
   * `treinamento_instancias_tenant`. Por isso o filtro é aplicado no recurso
   * embutido (`!inner` + `curso.empresa_id`): devolve apenas turmas da empresa
   * e mantém a ordenação por `data_inicio`.
   */
  async listarInstancias(empresaId: string, cursoId?: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (supabase as any)
      .from('treinamento_instancias')
      .select(
        '*, curso:catalogo_cursos!treinamento_instancias_curso_id_fkey!inner(nome, empresa_id), instrutor:colaboradores!treinamento_instancias_instrutor_id_fkey(nome_completo)'
      )
      .eq('curso.empresa_id', empresaId)
      .order('data_inicio', { ascending: true });
    if (cursoId) q = q.eq('curso_id', cursoId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  /**
   * Cria uma turma (instância).
   *
   * `treinamento_instancias` NÃO possui `empresa_id`: o vínculo é
   * `curso_id → catalogo_cursos.empresa_id` (policy
   * `treinamento_instancias_tenant`). Por isso:
   *   1. o curso é lido antes do INSERT (a RLS de `catalogo_cursos` só devolve
   *      curso do próprio tenant);
   *   2. quando o chamador informa `empresa_id`, ele é conferido contra o curso
   *      — nunca gravado na tabela;
   *   3. `empresa_id` é REMOVIDO do payload antes do INSERT.
   */
  async criarInstancia(d: any) {
    if (!d?.curso_id) throw new Error('curso_id obrigatório');
    const { empresa_id: empresaInformada, ...dados } = d;

    // Defesa: nenhum caminho pode gravar empresa_id nessa tabela.
    delete dados.empresa_id;

    const { data: curso, error: erroCurso } = await supabase
      .from('catalogo_cursos')
      .select('id, empresa_id')
      .eq('id', dados.curso_id)
      .maybeSingle();
    if (erroCurso) throw erroCurso;
    if (!curso) throw new Error('Curso não encontrado para esta empresa.');
    if (empresaInformada && curso.empresa_id !== empresaInformada) {
      throw new Error('Curso não pertence à empresa informada.');
    }

    const { data, error } = await supabase.from('treinamento_instancias').insert(dados).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  /**
   * Atualiza uma turma sem `empresa_id` (coluna inexistente).
   *
   * O escopo de tenant é validado ANTES do UPDATE pelo curso embutido
   * (`curso.catalogo_cursos.empresa_id`). Se a turma não pertencer à empresa,
   * nada é gravado — a mensagem não distingue "não existe" de "não é sua".
   */
  async atualizarInstancia(id: string, d: any, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data: atual, error: erroAtual } = await (supabase as any)
      .from('treinamento_instancias')
      .select('id, curso:catalogo_cursos!treinamento_instancias_curso_id_fkey!inner(empresa_id)')
      .eq('id', id)
      .eq('curso.empresa_id', empresaId)
      .maybeSingle();
    if (erroAtual) throw erroAtual;
    if (!atual) throw new Error('Turma não encontrada para esta empresa.');

    const dados = { ...(d ?? {}) };
    delete dados.empresa_id;
    if (Object.keys(dados).length === 0) return atual;

    const { data, error } = await (supabase as any)
      .from('treinamento_instancias')
      .update(dados)
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
  }) {
    const { data, error } = await supabase.from('treinamento_feedback').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * Lista os certificados da empresa.
   *
   * `treinamento_certificados` NÃO possui `empresa_id` (schema real). O vínculo
   * de tenant é `colaborador_id → colaboradores.empresa_id`, exatamente como a
   * RLS `treinamento_certificados` já assume. Por isso o filtro é aplicado no
   * recurso embutido com `!inner`: sem colaborador (ou com colaborador de outra
   * empresa) o certificado não pertence a nenhum tenant consultável e é omitido.
   *
   * O `select('*')` preserva todos os campos exibidos hoje (data de emissão,
   * validade, código de autenticação, arquivo) e o embed do curso continua
   * opcional (certificado pode não ter curso). `empresa_id` entra apenas no
   * embed do colaborador para permitir o filtro — nunca é uma coluna nova.
   */
  async listarCertificados(empresaId: string, colaboradorId?: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (supabase as any)
      .from('treinamento_certificados')
      .select(
        '*, curso:catalogo_cursos(nome, carga_horaria), colaborador:colaboradores!treinamento_certificados_colaborador_id_fkey!inner(nome_completo, empresa_id)'
      )
      .eq('colaborador.empresa_id', empresaId);
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
  },
};
