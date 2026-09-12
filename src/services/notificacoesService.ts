// V22: NotificacoesService - Real implementation
import { supabase } from '@/integrations/supabase/client';
export interface NotificationPayload {
  titulo: string;
  mensagem: string;
  tipo: 'sucesso' | 'erro' | 'info' | 'alerta';
  user_id?: string;
  empresa_id?: string;
  entidade_id?: string;
  entidade_tipo?: string;
}

export async function criarNotificacao(payload: NotificationPayload): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('notificacoes').insert({
    titulo: payload.titulo,
    mensagem: payload.mensagem,
    tipo: payload.tipo,
    user_id: payload.user_id || user?.id,
    empresa_id: payload.empresa_id,
    entidade_id: payload.entidade_id,
    entidade_tipo: payload.entidade_tipo,
    lida: false,
  });
  if (error) throw error;
}

export async function notificarResultadoSync(
  sucesso: boolean,
  registrosSincronizados: number,
  erros: string[]
): Promise<void> {
  return criarNotificacao({
    titulo: sucesso ? 'Sincronização concluída' : 'Erro na sincronização',
    mensagem: sucesso
      ? `${registrosSincronizados} registros sincronizados com sucesso.`
      : `Erros na sincronização: ${erros.join(', ')}`,
    tipo: sucesso ? 'sucesso' : 'erro',
  });
}

export async function notificarAjustePonto(
  colaboradorId: string,
  status: 'aprovado' | 'recusado',
  motivo?: string
): Promise<void> {
  try {
    const { data: colab, error: colaboradorError } = await supabase
      .from('colaboradores')
      .select('id, empresa_id, user_id')
      .eq('id', colaboradorId)
      .maybeSingle();
    if (colaboradorError) throw colaboradorError;

    if (colab) {
      // Sem um login vinculado não existe destinatário seguro. Nunca cair
      // no fallback de criarNotificacao, que notificaria o aprovador atual.
      if (!colab.user_id) return undefined;

      return criarNotificacao({
        titulo: `Ajuste de Ponto ${status === 'aprovado' ? 'Aprovado' : 'Recusado'}`,
        mensagem:
          status === 'aprovado'
            ? 'Seu ajuste de ponto foi aprovado pelo gestor.'
            : `Seu ajuste de ponto foi recusado. Motivo: ${motivo || 'Não informado'}`,
        tipo: status === 'aprovado' ? 'sucesso' : 'erro',
        user_id: colab.user_id,
        empresa_id: colab.empresa_id ?? undefined,
      });
    }
    return undefined;
  } catch (e) {
    throw new Error('Falha ao notificar ajuste de ponto', { cause: e });
  }
}

export const notificacoesService = {
  criarNotificacao,
  notificarResultadoSync,
  notificarAjustePonto,
};

export default notificacoesService;
