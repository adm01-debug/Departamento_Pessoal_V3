import { supabase } from '@/integrations/supabase/client';
import type {
  MedidaContestacaoAnexoRow,
  MedidaDisciplinarComColaborador,
  MedidaDisciplinarInsert,
  MedidaDisciplinarRow,
  MedidaDisciplinarUpdate,
  MedidaIntegracaoRow,
  MedidaPdfResultado,
  MedidaWorkflowLogRow,
  SugestaoProximaMedida,
} from '@/types/medidasDisciplinares';

/**
 * Serviço de Medidas Disciplinares (CLT).
 * Todas as leituras/escritas são escopadas por `empresa_id` (defesa em profundidade
 * sobre a RLS) e tipadas a partir do schema gerado do banco.
 */
export const medidasDisciplinaresService = {
  async listar(empresaId: string): Promise<MedidaDisciplinarComColaborador[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    const { data, error } = await supabase
      .from('medidas_disciplinares')
      .select('*, colaborador:colaboradores(nome_completo)')
      .eq('empresa_id', empresaId)
      .order('data_ocorrencia', { ascending: false })
      .returns<MedidaDisciplinarComColaborador[]>();
    if (error) throw error;
    return data ?? [];
  },

  async buscarPorColaborador(
    colaboradorId: string,
    empresaId: string,
  ): Promise<MedidaDisciplinarRow[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('medidas_disciplinares')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .order('data_ocorrencia', { ascending: false })
      .returns<MedidaDisciplinarRow[]>();
    if (error) throw error;
    return data ?? [];
  },

  async criar(d: MedidaDisciplinarInsert): Promise<MedidaDisciplinarRow> {
    const { data, error } = await supabase
      .from('medidas_disciplinares')
      .insert(d)
      .select()
      .maybeSingle<MedidaDisciplinarRow>();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de medida disciplinar foi retornado.');
    return data;
  },

  async atualizar(
    id: string,
    d: MedidaDisciplinarUpdate,
    empresaId: string,
  ): Promise<MedidaDisciplinarRow> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('medidas_disciplinares')
      .update(d)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle<MedidaDisciplinarRow>();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de medida disciplinar foi retornado.');
    return data;
  },

  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase
      .from('medidas_disciplinares')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);
    if (error) throw error;
  },

  async sugerirProxima(
    colaboradorId: string,
    empresaId: string,
  ): Promise<SugestaoProximaMedida | null> {
    if (!colaboradorId || !empresaId) return null;
    const { data, error } = await supabase.rpc('sugerir_proxima_medida', {
      p_colaborador_id: colaboradorId,
      p_empresa_id: empresaId,
    });
    if (error) throw error;
    const rows = data as unknown as SugestaoProximaMedida[] | null;
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  },

  async gerarPDF(medidaId: string): Promise<MedidaPdfResultado> {
    const { data, error } = await supabase.functions.invoke<
      Partial<MedidaPdfResultado> & { success?: boolean; error?: string }
    >('gerar-medida-disciplinar-pdf', {
      body: { medida_id: medidaId },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error ?? 'Falha ao gerar documento');
    if (!data.path || !data.hash || !data.signed_url) {
      throw new Error('Resposta incompleta ao gerar documento da medida disciplinar.');
    }
    return { path: data.path, hash: data.hash, signed_url: data.signed_url };
  },

  async obterSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from('medidas-disciplinares')
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },

  // ============ Workflow CLT ============
  async enviarAprovacao(medidaId: string): Promise<unknown> {
    const { data, error } = await supabase.rpc('medida_enviar_aprovacao', {
      _medida_id: medidaId,
    });
    if (error) throw error;
    return data;
  },
  async aprovar(medidaId: string, observacao?: string): Promise<unknown> {
    const { data, error } = await supabase.rpc('medida_aprovar', {
      _medida_id: medidaId,
      _observacao: observacao ?? null,
    });
    if (error) throw error;
    return data;
  },
  async rejeitar(medidaId: string, motivo: string): Promise<unknown> {
    const { data, error } = await supabase.rpc('medida_rejeitar', {
      _medida_id: medidaId,
      _motivo: motivo,
    });
    if (error) throw error;
    return data;
  },
  async arquivar(medidaId: string, observacao?: string): Promise<unknown> {
    const { data, error } = await supabase.rpc('medida_arquivar', {
      _medida_id: medidaId,
      _observacao: observacao ?? null,
    });
    if (error) throw error;
    return data;
  },
  async listarHistorico(medidaId: string): Promise<MedidaWorkflowLogRow[]> {
    const { data, error } = await supabase
      .from('medidas_disciplinares_workflow_log')
      .select('*')
      .eq('medida_id', medidaId)
      .order('created_at', { ascending: false })
      .returns<MedidaWorkflowLogRow[]>();
    if (error) throw error;
    return data ?? [];
  },

  // ============ Contestação ============
  async contestar(medidaId: string, texto: string): Promise<unknown> {
    const { data, error } = await supabase.rpc('medida_contestar', {
      _medida_id: medidaId,
      _texto: texto,
    });
    if (error) throw error;
    return data;
  },
  async responderContestacao(
    medidaId: string,
    resposta: string,
    aceita: boolean,
  ): Promise<unknown> {
    const { data, error } = await supabase.rpc('medida_responder_contestacao', {
      _medida_id: medidaId,
      _resposta: resposta,
      _aceita: aceita,
    });
    if (error) throw error;
    return data;
  },
  async uploadAnexoContestacao(
    medidaId: string,
    empresaId: string,
    file: File,
  ): Promise<MedidaContestacaoAnexoRow> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const path = `${empresaId}/${medidaId}/${crypto.randomUUID()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from('medidas-contestacoes')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) throw upErr;

    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('medidas_disciplinares_contestacao_anexos')
      .insert({
        medida_id: medidaId,
        empresa_id: empresaId,
        storage_path: path,
        nome_arquivo: file.name,
        mime_type: file.type,
        tamanho_bytes: file.size,
        hash_sha256: hash,
        uploaded_by: userData.user?.id ?? null,
      })
      .select()
      .maybeSingle<MedidaContestacaoAnexoRow>();
    if (error) throw error;
    if (!data) throw new Error('Falha ao registrar o anexo da contestação.');
    return data;
  },
  async listarAnexosContestacao(medidaId: string): Promise<MedidaContestacaoAnexoRow[]> {
    const { data, error } = await supabase
      .from('medidas_disciplinares_contestacao_anexos')
      .select('*')
      .eq('medida_id', medidaId)
      .order('created_at', { ascending: false })
      .returns<MedidaContestacaoAnexoRow[]>();
    if (error) throw error;
    return data ?? [];
  },
  async signedUrlAnexoContestacao(path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from('medidas-contestacoes')
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },

  // ============ Integração folha/ponto ============
  /** Log de integração medida -> folha/ponto. */
  async listarIntegracao(medidaId: string): Promise<MedidaIntegracaoRow[]> {
    const { data, error } = await supabase
      .from('medidas_disciplinares_integracao')
      .select('*')
      .eq('medida_id', medidaId)
      .order('created_at', { ascending: false })
      .returns<MedidaIntegracaoRow[]>();
    if (error) throw error;
    return data ?? [];
  },
  /** Aplica os efeitos da medida (desconto/suspensão) na folha e no ponto. */
  async aplicarIntegracao(medidaId: string): Promise<unknown> {
    const { data, error } = await supabase.rpc('aplicar_medida_folha_ponto', {
      p_medida_id: medidaId,
    });
    if (error) throw error;
    return data;
  },
};
