import { supabase } from '@/integrations/supabase/client';
export const medidasDisciplinaresService = {
  async listar(empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = (supabase as any).from('medidas_disciplinares').select('*, colaborador:colaboradores(nome_completo)').order('data_ocorrencia', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];

  },

  async buscarPorColaborador(colaboradorId: string, empresaId: string): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any)
      .from('medidas_disciplinares')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .order('data_ocorrencia', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async criar(d: any): Promise<any> {
    const { data, error } = await (supabase as any).from('medidas_disciplinares').insert(d).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de medida disciplinar foi retornado.');
    return data;
  },

  async atualizar(id: string, d: any, empresaId: string): Promise<any> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await (supabase as any)
      .from('medidas_disciplinares')
      .update(d)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de medida disciplinar foi retornado.');
    return data;
  },

  async excluir(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await (supabase as any)
      .from('medidas_disciplinares')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);
    if (error) throw error;
  },

  async sugerirProxima(colaboradorId: string, empresaId: string): Promise<{
    tipo_sugerido: string;
    justificativa: string;
    historico_12m: Record<string, number>;
  } | null> {
    if (!colaboradorId || !empresaId) return null;
    const { data, error } = await (supabase as any).rpc('sugerir_proxima_medida', {
      p_colaborador_id: colaboradorId,
      p_empresa_id: empresaId,
    });
    if (error) throw error;
    return Array.isArray(data) && data[0] ? data[0] : null;
  },

  async gerarPDF(medidaId: string): Promise<{ path: string; hash: string; signed_url: string }> {
    const { data, error } = await supabase.functions.invoke('gerar-medida-disciplinar-pdf', {
      body: { medida_id: medidaId },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error ?? 'Falha ao gerar documento');
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
  async enviarAprovacao(medidaId: string) {
    const { data, error } = await (supabase as any).rpc('medida_enviar_aprovacao', { _medida_id: medidaId });
    if (error) throw error;
    return data;
  },
  async aprovar(medidaId: string, observacao?: string) {
    const { data, error } = await (supabase as any).rpc('medida_aprovar', {
      _medida_id: medidaId,
      _observacao: observacao ?? null,
    });
    if (error) throw error;
    return data;
  },
  async rejeitar(medidaId: string, motivo: string) {
    const { data, error } = await (supabase as any).rpc('medida_rejeitar', {
      _medida_id: medidaId,
      _motivo: motivo,
    });
    if (error) throw error;
    return data;
  },
  async arquivar(medidaId: string, observacao?: string) {
    const { data, error } = await (supabase as any).rpc('medida_arquivar', {
      _medida_id: medidaId,
      _observacao: observacao ?? null,
    });
    if (error) throw error;
    return data;
  },
  async listarHistorico(medidaId: string) {
    const { data, error } = await (supabase as any)
      .from('medidas_disciplinares_workflow_log')
      .select('*')
      .eq('medida_id', medidaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // ============ Contestação ============
  async contestar(medidaId: string, texto: string) {
    const { data, error } = await (supabase as any).rpc('medida_contestar', {
      _medida_id: medidaId, _texto: texto,
    });
    if (error) throw error;
    return data;
  },
  async responderContestacao(medidaId: string, resposta: string, aceita: boolean) {
    const { data, error } = await (supabase as any).rpc('medida_responder_contestacao', {
      _medida_id: medidaId, _resposta: resposta, _aceita: aceita,
    });
    if (error) throw error;
    return data;
  },
  async uploadAnexoContestacao(medidaId: string, empresaId: string, file: File) {
    const path = `${empresaId}/${medidaId}/${crypto.randomUUID()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from('medidas-contestacoes')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) throw upErr;

    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from('medidas_disciplinares_contestacao_anexos')
      .insert({
        medida_id: medidaId, empresa_id: empresaId,
        storage_path: path, nome_arquivo: file.name,
        mime_type: file.type, tamanho_bytes: file.size, hash_sha256: hash,
        uploaded_by: userData.user?.id ?? null,
      })
      .select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async listarAnexosContestacao(medidaId: string) {
    const { data, error } = await (supabase as any)
      .from('medidas_disciplinares_contestacao_anexos')
      .select('*').eq('medida_id', medidaId).order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async signedUrlAnexoContestacao(path: string, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from('medidas-contestacoes').createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },
  async listarIntegracao(medidaId: string): Promise<any[]> {
    // Log de integração medida -> folha/ponto (backend em construção; degrada para vazio)
    const { data } = await (supabase.from('medida_integracao_log') as any)
      .select('*')
      .eq('medida_id', medidaId)
      .order('created_at', { ascending: false });
    return data ?? [];
  },
  async aplicarIntegracao(medidaId: string): Promise<any> {
    const { data, error } = await supabase.rpc('aplicar_integracao_medida' as any, { p_medida_id: medidaId } as any);
    if (error) throw error;
    return data;
  },
};
