import { supabase } from '@/integrations/supabase/client';

export const auditoriaService = {
  async listar(empresaId: string, filtros?: {
    tabela?: string;
    acao?: string;
    colaborador_id?: string;
    registro_id?: string;
    data_inicio?: string;
    data_fim?: string;
    limite?: number
  }) {
    if (!empresaId) throw new Error('empresa_id obrigatório');
    let query = (supabase
      .from('audit_log')
      .select('id, tabela, registro_id, acao, user_id, user_email, dados_anteriores, dados_novos, created_at') as any)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (filtros?.tabela) query = query.eq('tabela', filtros.tabela);
    if (filtros?.acao) query = query.eq('acao', filtros.acao);
    if (filtros?.registro_id) query = query.eq('registro_id', filtros.registro_id);

    if (filtros?.data_inicio) query = query.gte('created_at', filtros.data_inicio);
    if (filtros?.data_fim) query = query.lte('created_at', filtros.data_fim);

    query = query.limit(filtros?.limite || 200);

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  },

  async logComVersao(params: {
    tabela: string;
    registro_id: string;
    acao: 'UPDATE' | 'DELETE';
    dados_anteriores: any;
    dados_novos?: any;
    empresa_id?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();

    await (supabase.from('audit_log') as any).insert({
      tabela: params.tabela,
      registro_id: params.registro_id,
      acao: params.acao,
      dados_anteriores: params.dados_anteriores,
      dados_novos: params.dados_novos || null,
      user_id: user?.id,
      user_email: user?.email,
      empresa_id: params.empresa_id,
    });
  }
};

export const notificacaoService = {
  async listar(userId: string) {
    if (!userId) throw new Error('user_id obrigatório');
    const { data, error } = await supabase
      .from('notificacoes')
      .select('id, titulo, mensagem, lida, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  },
  async marcarComoLida(userId: string, id: string) {
    if (!id) throw new Error('id obrigatório');
    if (!userId) throw new Error('user_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
  async marcarTodasComoLidas(userId: string) {
    if (!userId) throw new Error('user_id obrigatório');
    const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('user_id', userId).eq('lida', false);
    if (error) throw error;
  },
};
