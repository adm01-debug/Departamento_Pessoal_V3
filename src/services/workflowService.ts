import { supabase } from '@/integrations/supabase/client';

// ── Tipos ───────────────────────────────────────────────────────────────────

interface EtapaConfig {
  nivel?: number;
  sla_horas?: number;
  papel?: string;
  [key: string]: unknown;
}

interface Etapa {
  id: string;
  workflow_id: string;
  nome: string;
  tipo: string;
  ordem: number;
  aprovador_tipo: string | null;
  aprovador_id: string | null;
  config: EtapaConfig | null;
  created_at: string;
}

interface Execucao {
  id: string;
  workflow_id: string;
  etapa_atual_id: string | null;
  entidade_tipo: string;
  entidade_id: string;
  status: 'pendente' | 'em_andamento' | 'aprovada' | 'rejeitada' | 'concluida';
  solicitante_id: string | null;
  dados: Record<string, unknown> | null;
  empresa_id: string;
  sla_iniciado_em: string | null;
  created_at: string;
  updated_at: string;
}

interface Historico {
  id: string;
  execucao_id: string;
  etapa_id: string | null;
  acao: string;
  usuario_id: string | null;
  observacoes: string | null;
  created_at: string;
}

interface SLAStatus {
  expired: boolean;
  hoursRemaining: number | null;
  deadlineUtc: string | null;
}

interface ExecucaoResult {
  execucao: Execucao;
  historico: Historico;
}

// ── Helpers internos ─────────────────────────────────────────────────────────

/** Retorna true se o usuário já agiu nesta etapa (idempotency). */
async function jaAgiuNaEtapa(
  execucaoId: string,
  etapaId: string,
  usuarioId: string,
  acao: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('workflows_historico')
    .select('id')
    .eq('execucao_id', execucaoId)
    .eq('etapa_id', etapaId)
    .eq('usuario_id', usuarioId)
    .eq('acao', acao)
    .maybeSingle();
  return !!data;
}

/** Calcula status de SLA da execução. */
function calcularSLA(execucao: Execucao, etapa: Etapa): SLAStatus {
  const config = etapa.config ?? {};
  const slaHoras = config.sla_horas ?? 48;
  const started = execucao.sla_iniciado_em ?? execucao.updated_at;

  const deadlineMs = new Date(started).getTime() + slaHoras * 60 * 60 * 1000;
  const nowMs = Date.now();
  const hoursRemaining = (deadlineMs - nowMs) / (60 * 60 * 1000);

  return {
    expired: nowMs > deadlineMs,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    deadlineUtc: new Date(deadlineMs).toISOString(),
  };
}

/** Obtém próxima etapa na ordem. Retorna null se for a última. */
async function proximaEtapa(
  workflowId: string,
  ordemAtual: number,
): Promise<Etapa | null> {
  const { data } = await supabase
    .from('workflows_etapas')
    .select('*')
    .eq('workflow_id', workflowId)
    .gt('ordem', ordemAtual)
    .order('ordem', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as Etapa | null;
}

// ── Serviço ─────────────────────────────────────────────────────────────────

export const workflowService = {
  // ── CRUD (já existente) ────────────────────────────────────────────────

  async listarDefinicoes(empresaId: string): Promise<Etapa[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any)
      .from('workflows_definicoes')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Etapa[];
  },

  async criarDefinicao(d: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await (supabase as any)
      .from('workflows_definicoes')
      .insert(d)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de workflow foi retornado.');
    return data;
  },

  async atualizarDefinicao(
    id: string,
    d: Record<string, unknown>,
    empresaId: string,
  ): Promise<unknown> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any)
      .from('workflows_definicoes')
      .update({ ...d, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Workflow não encontrado ou sem permissão.');
    return data;
  },

  async excluirDefinicao(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await (supabase as any)
      .from('workflows_definicoes')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);
    if (error) throw error;
  },

  async listarEtapas(workflowId: string): Promise<Etapa[]> {
    const { data, error } = await (supabase as any)
      .from('workflows_etapas')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('ordem');
    if (error) throw error;
    return (data ?? []) as unknown as Etapa[];
  },

  async criarEtapa(d: Record<string, unknown>): Promise<Etapa> {
    const { data, error } = await (supabase as any)
      .from('workflows_etapas')
      .insert(d)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Etapa não foi criada.');
    return data as Etapa;
  },

  async excluirEtapa(workflowId: string, id: string): Promise<void> {
    if (!workflowId) throw new Error('workflow_id obrigatório');
    const { error } = await (supabase as any)
      .from('workflows_etapas')
      .delete()
      .eq('id', id)
      .eq('workflow_id', workflowId);
    if (error) throw error;
  },

  async listarExecucoes(empresaId: string): Promise<Execucao[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any)
      .from('workflows_execucoes')
      .select('*, workflow:workflows_definicoes(nome, tipo)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as unknown as Execucao[];
  },

  async criarExecucao(d: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await (supabase as any)
      .from('workflows_execucoes')
      .insert(d)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Execução não foi criada.');
    return data;
  },

  async atualizarExecucao(
    id: string,
    d: Record<string, unknown>,
    empresaId: string,
  ): Promise<Execucao> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any)
      .from('workflows_execucoes')
      .update({ ...d, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Execução não encontrada ou sem permissão.');
    return data as unknown as Execucao;
  },

  async registrarHistorico(d: Record<string, unknown>): Promise<Historico> {
    const { data, error } = await (supabase as any)
      .from('workflows_historico')
      .insert(d)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Histórico não foi registrado.');
    return data as Historico;
  },

  // ── Execução de workflow (P5-083) ───────────────────────────────────────

  /**
   * Inicia uma execução do workflow — encontra a primeira etapa e cria
   * o registro em workflows_execucoes. Idempotent via entidade_tipo+entidade_id.
   */
  async executarWorkflow(
    workflowId: string,
    entidadeTipo: string,
    entidadeId: string,
    empresaId: string,
    solicitanteId: string,
    dados: Record<string, unknown> = {},
    idempotencyKey?: string,
  ): Promise<Execucao> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    if (!workflowId) throw new Error('workflow_id obrigatório');
    if (!entidadeTipo || !entidadeId) throw new Error('entidade_tipo e entidade_id obrigatórios');

    // Idempotency: se já existe execução ativa para esta entidade, retorna a existente
    const { data: existing } = await (supabase as any)
      .from('workflows_execucoes')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('entidade_tipo', entidadeTipo)
      .eq('entidade_id', entidadeId)
      .in('status', ['pendente', 'em_andamento'])
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (existing) return existing as unknown as Execucao;

    // Verifica que o workflow está ativo
    const { data: definicao } = await (supabase as any)
      .from('workflows_definicoes')
      .select('id, ativo')
      .eq('id', workflowId)
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (!definicao) throw new Error('Workflow não encontrado.');
    if (!definicao.ativo) throw new Error('Workflow está desativado.');

    // Primeira etapa (ordem = 1)
    const { data: primeiraEtapa } = await (supabase as any)
      .from('workflows_etapas')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('ordem', 1)
      .maybeSingle();
    if (!primeiraEtapa) throw new Error('Workflow não tem etapas configuradas.');

    const now = new Date().toISOString();
    const execData = {
      workflow_id: workflowId,
      etapa_atual_id: primeiraEtapa.id,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      status: 'em_andamento',
      solicitante_id: solicitanteId,
      dados: dados as Record<string, unknown>,
      empresa_id: empresaId,
      sla_iniciado_em: now,
    };

    const { data: execucao, error: execError } = await (supabase as any)
      .from('workflows_execucoes')
      .insert(execData)
      .select()
      .maybeSingle();
    if (execError) throw execError;
    if (!execucao) throw new Error('Falha ao criar execução.');

    // Log de início
    await (supabase as any).from('workflows_historico').insert({
      execucao_id: execucao.id,
      etapa_id: primeiraEtapa.id,
      acao: 'iniciou',
      usuario_id: solicitanteId,
      observacoes: idempotencyKey ? `idempotencyKey=${idempotencyKey}` : null,
    });

    return execucao as unknown as Execucao;
  },

  /**
   * Registra aprovação ou rejeição de uma etapa.
   * Idempotency: se o usuário já agiu nesta etapa, retorna erro 409.
   */
  async registrarAprovacao(
    execucaoId: string,
    etapaId: string,
    usuarioId: string,
    aprovado: boolean,
    observacao: string | null,
    empresaId: string,
  ): Promise<ExecucaoResult> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    // Busca execução atual
    const { data: execucao } = await (supabase as any)
      .from('workflows_execucoes')
      .select('*')
      .eq('id', execucaoId)
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (!execucao) throw new Error('Execução não encontrada ou sem permissão.');
    if (execucao.etapa_atual_id !== etapaId) {
      throw new Error(`Etapa ${etapaId} não é a etapa atual desta execução.`);
    }
    if (!['pendente', 'em_andamento'].includes(execucao.status)) {
      throw new Error(`Execução já está ${execucao.status} — não pode ser alterada.`);
    }

    // Idempotency: usuário já agiu nesta etapa?
    const acao = aprovado ? 'aprovou' : 'rejeitou';
    const jaAgiu = await jaAgiuNaEtapa(execucaoId, etapaId, usuarioId, acao);
    if (jaAgiu) {
      const err: NodeJS.ErrnoException = new Error('Esta etapa já foi processada por este usuário.');
      err.code = 'CONFLICT';
      throw err;
    }

    // Atualiza ou avança
    const { data: etapa } = await (supabase as any)
      .from('workflows_etapas')
      .select('*')
      .eq('id', etapaId)
      .maybeSingle();
    if (!etapa) throw new Error(`Etapa ${etapaId} não encontrada.`);

    const now = new Date().toISOString();
    const proxima = await proximaEtapa(execucao.workflow_id, etapa.ordem);

    let novoStatus: Execucao['status'] = 'em_andamento';
    let proximaEtapaId: string | null = proxima?.id ?? null;
    let novoSlaInicio: string | null;

    if (!aprovado) {
      // Rejeição — workflow encerrado
      novoStatus = 'rejeitada';
      proximaEtapaId = null;
      novoSlaInicio = null;
    } else if (!proxima) {
      // Última etapa aprovada — concluída
      novoStatus = 'concluida';
      proximaEtapaId = null;
      novoSlaInicio = null;
    } else {
      // Avança para próxima etapa — reinicia SLA
      novoSlaInicio = now;
    }

    const updatePayload: Record<string, unknown> = {
      status: novoStatus,
      etapa_atual_id: proximaEtapaId,
      sla_iniciado_em: novoSlaInicio,
    };

    const { data: updated, error: updateError } = await (supabase as any)
      .from('workflows_execucoes')
      .update({ ...updatePayload, updated_at: now })
      .eq('id', execucaoId)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) throw new Error('Falha ao atualizar execução.');

    // Registra histórico
    const { data: historico } = await (supabase as any)
      .from('workflows_historico')
      .insert({
        execucao_id: execucaoId,
        etapa_id: etapaId,
        acao,
        usuario_id: usuarioId,
        observacoes: observacao ?? null,
      })
      .select()
      .maybeSingle();

    return { execucao: updated as unknown as Execucao, historico: historico as unknown as Historico };
  },

  /**
   * Retorna status de SLA da etapa atual de uma execução.
   */
  async statusSLA(execucaoId: string, empresaId: string): Promise<SLAStatus | null> {
    const { data: execucao } = await (supabase as any)
      .from('workflows_execucoes')
      .select('*, etapa_atual:workflows_etapas(*)')
      .eq('id', execucaoId)
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (!execucao || !execucao.etapa_atual_id) return null;
    return calcularSLA(execucao as unknown as Execucao, execucao.etapa_atual as unknown as Etapa);
  },

  /**
   * Lista execuções com SLA vencido (para cron/alert).
   */
  async execucoesComSLAVencido(empresaId: string): Promise<Execucao[]> {
    const { data: execucoes } = await (supabase as any)
      .from('workflows_execucoes')
      .select('*, workflows_etapas(*)')
      .eq('empresa_id', empresaId)
      .in('status', ['pendente', 'em_andamento'])
      .not('sla_iniciado_em', 'is', null);
    if (!execucoes) return [];

    const now = Date.now();
    return (execucoes as unknown[]).filter((e: unknown) => {
      const exec = e as { sla_iniciado_em: string; workflows_etapas: Etapa };
      const config = exec.workflows_etapas?.config ?? {};
      const slaHoras = config.sla_horas ?? 48;
      const deadlineMs = new Date(exec.sla_iniciado_em).getTime() + slaHoras * 3_600_000;
      return now > deadlineMs;
    }) as unknown as unknown as Execucao[];
  },
};