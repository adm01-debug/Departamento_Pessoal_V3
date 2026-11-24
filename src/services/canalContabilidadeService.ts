import { supabase } from '@/integrations/supabase/client';
import { validateUploadFile } from '@/utils/uploadValidation';

export type ThreadStatus = 'aberto' | 'respondido' | 'resolvido' | 'arquivado';
export type ThreadCategoria = 'folha' | 'esocial' | 'admissao' | 'rescisao' | 'tributos' | 'ferias' | 'outro';
export type ThreadPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente';
export type AutorTipo = 'rh' | 'contabilidade' | 'sistema';

const BUCKET = 'contabilidade-anexos';

export const canalContabilidadeService = {
  // ---------- contatos ----------
  async listContatos(empresaId: string) {
    const { data, error } = await supabase
      .from('contabilidade_contatos' as any)
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');
    if (error) throw error;
    return data || [];
  },

  async criarContato(
    empresaId: string,
    payload: { nome: string; email: string; telefone?: string; escritorio?: string }
  ) {
    const { data, error } = await supabase
      .from('contabilidade_contatos' as any)
      .insert({ ...payload, empresa_id: empresaId })
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async toggleContato(empresaId: string, id: string, ativo: boolean) {
    const { error } = await supabase.from('contabilidade_contatos' as any).update({ ativo }).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // ---------- threads ----------
  async listThreads(empresaId: string, filtroStatus?: ThreadStatus) {
    let q = supabase
      .from('contabilidade_threads' as any)
      .select('*, contato:contabilidade_contatos(nome, email)')
      .eq('empresa_id', empresaId)
      .order('ultima_atividade_em', { ascending: false })
      .limit(200);
    if (filtroStatus) q = q.eq('status', filtroStatus);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async criarThread(
    empresaId: string,
    payload: {
      assunto: string;
      categoria: ThreadCategoria;
      prioridade?: ThreadPrioridade;
      contato_id?: string | null;
      mensagemInicial: string;
    }
  ) {
    const { data: user } = await supabase.auth.getUser();
    const { data: thread, error } = await supabase
      .from('contabilidade_threads' as any)
      .insert({
        empresa_id: empresaId,
        assunto: payload.assunto,
        categoria: payload.categoria,
        prioridade: payload.prioridade || 'normal',
        contato_id: payload.contato_id || null,
        aberto_por: user.user?.id ?? null,
      })
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!thread) throw new Error('Falha ao criar thread');
    await this.enviarMensagem((thread as any).id, empresaId, payload.mensagemInicial, 'rh');
    return thread;
  },

  async atualizarStatus(empresaId: string, threadId: string, status: ThreadStatus) {
    const patch: any = { status };
    if (status === 'resolvido') patch.resolvido_em = new Date().toISOString();
    const { error } = await supabase.from('contabilidade_threads' as any).update(patch).eq('id', threadId).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // ---------- mensagens ----------
  async listMensagens(threadId: string) {
    const { data, error } = await supabase
      .from('contabilidade_mensagens' as any)
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async enviarMensagem(
    threadId: string,
    empresaId: string,
    corpo: string,
    autorTipo: AutorTipo = 'rh',
    anexos: any[] = []
  ) {
    if (!corpo?.trim()) throw new Error('Mensagem vazia');
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('contabilidade_mensagens' as any)
      .insert({
        thread_id: threadId,
        empresa_id: empresaId,
        corpo: corpo.trim(),
        autor_tipo: autorTipo,
        autor_id: user.user?.id ?? null,
        autor_nome: user.user?.email ?? null,
        anexos,
      })
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // ---------- anexos ----------
  async uploadAnexo(empresaId: string, threadId: string, file: File) {
    validateUploadFile(file);
    const safe = file.name.replace(/[^\w.-]/g, '_');
    const path = `${empresaId}/${threadId}/${Date.now()}_${safe}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (error) throw error;
    return { path, nome: file.name, tamanho: file.size, mime: file.type };
  },

  async getAnexoUrl(path: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
    if (error) return null;
    return data?.signedUrl ?? null;
  },
};
