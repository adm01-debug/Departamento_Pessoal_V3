import { supabase } from '@/integrations/supabase/client';
// Portão do modo real do Nine-Box (colocado junto da funcionalidade). Enquanto o
// modo real estiver desligado, as operações de RPC lançam erro — nunca simulam.
import { exigirModoReal } from '@/components/avaliacao/nineBoxModo';
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
    exigirModoReal('Criar avaliação (auditada)');
    // Dupla proteção da escrita: modo real (acima) + ausência de dado fictício.
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

  // === Nine-Box: operações sensíveis (RPC transacional; modo real obrigatório) ===
  // O portão `exigirModoReal` garante que NADA é simulado: com o modo real
  // desligado (padrão), estas funções lançam erro em vez de fingir sucesso.
  // A autorização real acontece no servidor (RPC); aqui só se monta o payload.
  async finalizarFeedback(params: {
    feedbackId: string;
    acao: 'concluir' | 'cancelar' | 'reabrir';
    motivo?: string | null;
    idOperacao: string;
  }) {
    exigirModoReal(`Finalizar avaliação (${params.acao})`);
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
    exigirModoReal('Validar potencial');
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
    exigirModoReal('Consultar validações de potencial');
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
    exigirModoReal('Consultar versões das avaliações');
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
