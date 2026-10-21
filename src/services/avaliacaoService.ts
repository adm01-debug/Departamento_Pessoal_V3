import { supabase } from '@/integrations/supabase/client';
// Guarda de escrita: bloqueia id fictício (`mock-*`) e o ambiente de
// demonstração em TODA escrita operacional — a flag da matriz não basta.
import { exigirEscritaOperacional } from '@/components/avaliacao/escritaOperacional';

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
  /**
   * Portão de autorização para operações de ciclo. O banco também valida por
   * RLS/trigger; esta checagem evita que uma chamada direta do app apresente
   * sucesso sem permissão e mantém a UI e o serviço com a mesma regra.
   */
  async garantirGestaoCiclos(operacao: string) {
    const { data, error } = await (supabase as any).rpc('pode_gerir_avaliacoes');
    if (error) throw error;
    if (data !== true) {
      throw new Error(`"${operacao}" bloqueada: perfil_nao_autorizado (RH/admin).`);
    }
  },
  async criarCiclo(d: any) {
    await avaliacaoService.garantirGestaoCiclos('Criar ciclo');
    const { data, error } = await supabase.from('ciclos_avaliacao').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data?.id) {
      throw new Error('O banco não confirmou o INSERT do ciclo. Nada foi considerado criado.');
    }
    return data;
  },
  /**
   * Dependências REAIS de um ciclo. A exclusão física só é permitida quando
   * todas são zero; caso contrário a UI bloqueia e não apaga nada em cascata.
   */
  async contarDependenciasCiclo(cicloId: string, empresaId: string) {
    if (!cicloId) throw new Error('ciclo_id obrigatório');
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const tabelas = [
      'feedbacks_360',
      'feedbacks_360_consolidacoes',
      'feedbacks_360_aprovacoes_gestor',
      'feedbacks_360_validacoes_potencial',
      'metas_okrs',
    ] as const;
    const entradas = await Promise.all(
      tabelas.map(async (tabela) => {
        const { count, error } = await (supabase as any)
          .from(tabela)
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .eq('ciclo_id', cicloId);
        if (error) throw error;
        return [tabela, Number(count ?? 0)] as const;
      })
    );
    const porTabela = Object.fromEntries(entradas);
    const total = entradas.reduce((soma, [, n]) => soma + n, 0);
    return { total, porTabela };
  },
  async excluirCiclo(id: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    await avaliacaoService.garantirGestaoCiclos('Excluir ciclo');
    const { error } = await supabase.from('ciclos_avaliacao').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // === Metas ===
  // colaboradorId opcional (PARTE G): usado pelo Dossiê para mostrar só as
  // metas do colaborador; sem ele, mantém o comportamento existente (empresa toda).
  async listarMetas(empresaId: string, colaboradorId?: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase
      .from('metas_okrs')
      .select('*, colaborador:colaboradores(nome_completo)')
      .order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    if (colaboradorId) q = q.eq('colaborador_id', colaboradorId);
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
  async listarPDIs(empresaId: string, colaboradorId?: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase
      .from('pdi_plano_desenvolvimento')
      .select('*, colaborador:colaboradores(nome_completo)')
      .order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    if (colaboradorId) q = q.eq('colaborador_id', colaboradorId);
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
    const { error } = await supabase
      .from('pdi_plano_desenvolvimento')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // === Feedbacks ===
  // avaliadoId opcional (PARTE G): filtra pelo colaborador avaliado, não pelo
  // avaliador — é o que o Dossiê do avaliado precisa mostrar.
  async listarFeedbacks(empresaId: string, avaliadoId?: string) {
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
    if (avaliadoId) q = q.eq('avaliado_id', avaliadoId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async criarFeedback(d: any) {
    // Guarda obrigatória: nenhum registro com identificador fictício (`mock-*`)
    // e nenhuma gravação com a área em modo demonstração.
    exigirEscritaOperacional('Criar feedback', {
      empresa_id: d?.empresa_id,
      avaliado_id: d?.avaliado_id,
      avaliador_id: d?.avaliador_id,
      ciclo_id: d?.ciclo_id,
    });
    const { data, error } = await supabase.from('feedbacks_360').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  /**
   * CRIAÇÃO SEGURA (RPC) — feedback + auditoria na MESMA transação.
   *
   * Mesmo contrato de dados do formulário existente (`NovoFeedbackDialog` envia
   * `avaliado_id`, `avaliador_id`, `tipo`, `nota_geral`, `potencial`, `ciclo_id`
   * e os textos). A diferença é que aqui o SERVIDOR decide: papel, empresa,
   * categoria, escala das notas, trilha de auditoria e idempotência.
   *
   * Ainda NÃO é o caminho padrão: fica atrás do modo real e requer a
   * `criar_feedback_seguro` aplicada. Requer `idOperacao` novo por criação
   * (reaproveitado apenas em retentativa).
   */
  async criarFeedbackSeguro(params: {
    empresaId: string;
    avaliadoId: string;
    cicloId: string;
    tipo: 'gestor' | 'par' | 'auto' | 'subordinado';
    notaGeral: number;
    potencial?: number | null;
    avaliadorId?: string | null;
    pontosFortes?: string | null;
    pontosMelhoria?: string | null;
    comentarios?: string | null;
    idOperacao: string;
  }) {
    // Proteção da escrita: recusa de ID fictício (`mock-*`) — nunca envia mock ao banco.
    exigirEscritaOperacional('Criar avaliação (auditada)', {
      empresa_id: params.empresaId,
      avaliado_id: params.avaliadoId,
      ciclo_id: params.cicloId,
      avaliador_id: params.avaliadorId,
    });
    const { data, error } = await (supabase as any).rpc('criar_feedback_seguro', {
      p_empresa_id: params.empresaId,
      p_avaliado_id: params.avaliadoId,
      p_ciclo_id: params.cicloId,
      p_tipo: params.tipo,
      p_nota_geral: params.notaGeral,
      p_potencial: params.potencial ?? null,
      p_avaliador_id: params.avaliadorId ?? null,
      p_pontos_fortes: params.pontosFortes ?? null,
      p_pontos_melhoria: params.pontosMelhoria ?? null,
      p_comentarios: params.comentarios ?? null,
      p_idempotencia: params.idOperacao,
    });
    if (error) throw error;
    return data as { ok: boolean; feedback_id: string; status: string; auditoria_id: string; idempotente: boolean };
  },

  /**
   * EDIÇÃO SEGURA (RPC `editar_feedback_seguro`) — usada pelo formulário dos
   * filtros normais. Só RH/admin (revalidado no servidor). Registro CONCLUÍDO é
   * reaberto (status `pendente`), `revisao` sobe e a versão consolidada muda —
   * as aprovações/validações anteriores deixam de valer. Auditoria antes/depois
   * e idempotência por operação ficam no servidor.
   */
  async editarFeedbackSeguro(params: {
    feedbackId: string;
    avaliado_id: string;
    avaliador_id: string;
    ciclo_id: string | null;
    tipo: string;
    nota_geral: number;
    potencial?: number | null;
    pontos_fortes?: string | null;
    pontos_melhoria?: string | null;
    comentarios?: string | null;
    idOperacao: string;
  }) {
    // Guarda de escrita: `mock-*` nunca chega à rede.
    exigirEscritaOperacional('Editar avaliação (auditada)', {
      feedback_id: params.feedbackId,
      avaliado_id: params.avaliado_id,
      avaliador_id: params.avaliador_id,
      ciclo_id: params.ciclo_id,
    });
    const { data, error } = await (supabase as any).rpc('editar_feedback_seguro', {
      p_feedback_id: params.feedbackId,
      p_avaliado_id: params.avaliado_id,
      p_avaliador_id: params.avaliador_id,
      p_ciclo_id: params.ciclo_id,
      p_tipo: params.tipo,
      p_nota: params.nota_geral,
      p_potencial: params.potencial ?? null,
      p_pontos_fortes: params.pontos_fortes ?? null,
      p_pontos_melhoria: params.pontos_melhoria ?? null,
      p_comentarios: params.comentarios ?? null,
      p_idempotencia: params.idOperacao,
    });
    if (error) throw error;
    return data as {
      ok: boolean;
      feedback_id: string;
      status: string;
      revisao: number;
      reaberta: boolean;
      versao_avaliacao: string;
      idempotente: boolean;
    };
  },

  /**
   * @deprecated A EXCLUSÃO FÍSICA não é permitida no módulo de desempenho.
   *
   * A correção de segurança R2 (`20261015090000_ninebox_finalizacao_e_potencial.sql`)
   * remove o privilégio e a policy de DELETE em `feedbacks_360`: a regra oficial
   * é **CANCELAR**, preservando o registro e produzindo auditoria.
   *
   * O método é MANTIDO para não quebrar quem o importa (não há consumidores na
   * interface — verificado), mas falha de forma explícita em vez de tentar uma
   * operação que o banco passará a recusar.
   */
  async excluirFeedback(id: string, empresaId: string): Promise<never> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    throw new Error(
      `EXCLUSAO_FISICA_DESATIVADA: o feedback ${id} não pode ser apagado. ` +
        'Use o cancelamento auditado (avaliacaoService.finalizarFeedback com acao "cancelar"), ' +
        'que preserva o registro, exige motivo e grava trilha em audit_log.'
    );
  },

  // === Nine-Box: operações sensíveis (RPC transacional) ===
  // A autorização real acontece no servidor (RPC); aqui só se monta o payload.
  // A proteção local é a de ID FICTÍCIO (`mock-*`) — visualização nunca grava.
  async finalizarFeedback(params: {
    feedbackId: string;
    acao: 'concluir' | 'cancelar' | 'reabrir';
    motivo?: string | null;
    idOperacao: string;
  }) {
    exigirEscritaOperacional(`Finalizar avaliação (${params.acao})`, { feedback_id: params.feedbackId });
    const { data, error } = await (supabase as any).rpc('finalizar_feedback', {
      p_feedback_id: params.feedbackId,
      p_acao: params.acao,
      p_motivo: params.motivo ?? null,
      p_idempotencia: params.idOperacao,
    });
    if (error) throw error;
    return data as {
      ok: boolean;
      status_anterior: string | null;
      status_novo: string;
      auditoria_id: string;
      idempotente: boolean;
    };
  },

  async validarPotencialAvaliacao(params: { feedbackId: string; idOperacao: string; observacao?: string | null }) {
    exigirEscritaOperacional('Validar potencial', { feedback_id: params.feedbackId });
    const { data, error } = await (supabase as any).rpc('validar_potencial_avaliacao', {
      p_feedback_id: params.feedbackId,
      p_idempotencia: params.idOperacao,
      p_observacao: params.observacao ?? null,
    });
    if (error) throw error;
    return data as {
      ok: boolean;
      validacao_id: string;
      versao_avaliacao: string;
      potencial_validado: number;
      idempotente: boolean;
    };
  },

  /**
   * Validações de Potencial da empresa (histórico completo; a vigente é a mais
   * recente cuja `versao_avaliacao` casa com a versão atual da avaliação).
   */
  async listarValidacoesPotencial(empresaId: string, cicloId?: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (supabase as any)
      .from('feedbacks_360_validacoes_potencial')
      .select('*')
      .order('validado_em', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    if (cicloId) q = q.eq('ciclo_id', cicloId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  /** Versão canônica de cada avaliação — o BANCO é a autoridade (o front só lê). */
  async listarVersoesAvaliacao(empresaId: string, cicloId?: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (supabase as any)
      .from('vw_feedbacks_360_versao')
      .select('feedback_id, empresa_id, ciclo_id, tipo, status, potencial, versao_avaliacao');
    q = q.eq('empresa_id', empresaId);
    if (cicloId) q = q.eq('ciclo_id', cicloId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  // === Aprovação do gestor (migration `20261017090000_ninebox_aprovacao_gestor`) ===

  /**
   * Cabeçalho do fluxo: 1 linha por (empresa, ciclo, colaborador) com o status
   * corrente e o `enviado_em`. A RLS já limita às empresas do usuário e, quando
   * ele não é RH/admin, aos colaboradores que ele GERENCIA (`supervisor_id`).
   */
  async listarConsolidacoes(empresaId: string, cicloId?: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (supabase as any)
      .from('feedbacks_360_consolidacoes')
      .select('*')
      .order('atualizado_em', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    if (cicloId) q = q.eq('ciclo_id', cicloId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  /** Histórico append-only das decisões do GESTOR (a vigente é a mais recente). */
  async listarAprovacoesGestor(empresaId: string, cicloId?: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = (supabase as any)
      .from('feedbacks_360_aprovacoes_gestor')
      .select('*')
      .order('decidido_em', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    if (cicloId) q = q.eq('ciclo_id', cicloId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  /**
   * RH/admin envia a avaliação consolidada ao gestor (RPC
   * `enviar_avaliacao_ao_gestor`). O servidor revalida papel
   * (`pode_gerir_avaliacoes`), empresa, existência da avaliação do GESTOR e a
   * chave de idempotência; a guarda local recusa identificador fictício ANTES
   * da rede (nenhum `mock-*` é enviado).
   */
  async enviarAvaliacaoAoGestor(params: { colaboradorId: string; cicloId: string; idOperacao: string }) {
    exigirEscritaOperacional('Enviar avaliação ao gestor', {
      colaborador_id: params.colaboradorId,
      ciclo_id: params.cicloId,
    });
    const { data, error } = await (supabase as any).rpc('enviar_avaliacao_ao_gestor', {
      p_colaborador_id: params.colaboradorId,
      p_ciclo_id: params.cicloId,
      p_idempotencia: params.idOperacao,
    });
    if (error) throw error;
    return data as { ok: boolean; status: string };
  },

  /**
   * Decisão do GESTOR vinculado (RPC `decidir_aprovacao_gestor`): `aprovado` ou
   * `devolvido`. A devolução EXIGE justificativa (o servidor recusa com menos de
   * 10 caracteres); o front valida antes para não gastar rede. RH/admin NÃO
   * aprovam por este caminho — a RPC responde `perfil_nao_autorizado`.
   */
  async decidirAprovacaoGestor(params: {
    colaboradorId: string;
    cicloId: string;
    decisao: 'aprovado' | 'devolvido';
    justificativa?: string | null;
    idOperacao: string;
  }) {
    exigirEscritaOperacional(`Decidir aprovação (${params.decisao})`, {
      colaborador_id: params.colaboradorId,
      ciclo_id: params.cicloId,
    });
    const { data, error } = await (supabase as any).rpc('decidir_aprovacao_gestor', {
      p_colaborador_id: params.colaboradorId,
      p_ciclo_id: params.cicloId,
      p_decisao: params.decisao,
      p_justificativa: params.justificativa ?? null,
      p_idempotencia: params.idOperacao,
    });
    if (error) throw error;
    return data as {
      ok: boolean;
      aprovacao_id: string;
      decisao: string;
      status: string;
      versao_avaliacao: string;
      idempotente: boolean;
    };
  },

  /**
   * Vínculos MÍNIMOS do colaborador (`id`, `user_id`, `supervisor_id`) — base da
   * conferência de responsabilidade do GESTOR no front (o servidor revalida em
   * `pode_aprovar_colaborador`). É leitura mínima e escopada à empresa: nenhum
   * UPDATE é concedido a `gestor` e nenhum SELECT amplo é criado por isto — a
   * RLS de `colaboradores` continua decidindo quem enxerga cada linha.
   */
  async listarVinculos(empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any)
      .from('colaboradores')
      .select('id, user_id, supervisor_id')
      .eq('empresa_id', empresaId);
    if (error) throw error;
    return data || [];
  },

  /**
   * AUTORIZAÇÃO EFETIVA DO SERVIDOR (`pode_aprovar_colaborador`).
   *
   * Fonte ÚNICA para a interface reconhecer vínculo, autoaprovação permitida ou
   * exceção temporária de homologação. Não há lista de e-mails no front: a
   * função SQL aplica empresa, papéis, vínculo/exceção e expiração. A RPC de
   * decisão revalida no momento da gravação.
   */
  async podeAprovarColaborador(colaboradorId: string) {
    const id = String(colaboradorId ?? '').trim();
    if (!id) return false;
    const { data, error } = await (supabase as any).rpc('pode_aprovar_colaborador', {
      p_colaborador_id: id,
    });
    if (error) throw error;
    return data === true;
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
