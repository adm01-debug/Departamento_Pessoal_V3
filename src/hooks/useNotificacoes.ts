/**
 * @fileoverview Hook para gerenciamento de notificações
 * @module hooks/useNotificacoes
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, addDays, format } from 'date-fns';
import { useEmpresas } from '@/hooks/useEmpresas';

interface ColaboradorRelation {
  id: string;
  nome_completo: string;
  status: string;
  email?: string;
}

export interface Notificacao {
  id: string;
  user_id: string | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  entidade_tipo: string | null;
  entidade_id: string | null;
  lida: boolean;
  data_referencia: string | null;
  created_at: string;
}

export function useNotificacoes() {
  const queryClient = useQueryClient();
  const { empresaAtualId } = useEmpresas();

  const { data: notificacoes = [], isLoading, refetch } = useQuery({
    queryKey: ['notificacoes', empresaAtualId],
    enabled: !!empresaAtualId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('id, titulo, mensagem, lida, created_at, tipo, entidade_tipo, entidade_id, user_id, data_referencia')
        .eq('empresa_id', empresaAtualId!)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notificacao[];
    },
  });

  const marcarComoLida = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id).eq('empresa_id', empresaAtualId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const marcarTodasComoLidas = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('lida', false)
        .eq('empresa_id', empresaAtualId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const excluirNotificacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notificacoes').delete().eq('id', id).eq('empresa_id', empresaAtualId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const limparAntigas = useMutation({
    mutationFn: async () => {
      const dataLimite = addDays(new Date(), -30).toISOString();
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .lt('created_at', dataLimite)
        .eq('lida', true)
        .eq('empresa_id', empresaAtualId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const criarNotificacao = useMutation({
    mutationFn: async (data: {
      tipo: string;
      titulo: string;
      mensagem: string;
      entidade_tipo?: string;
      entidade_id?: string;
      user_id?: string;
      empresa_id?: string;
    }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const payload = {
        ...data,
        user_id: data.user_id || currentUser?.id,
        empresa_id: data.empresa_id || empresaAtualId,
        lida: false,
      };
      const { error } = await supabase.from('notificacoes').insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const gerarNotificacoesAutomaticas = useMutation({
    mutationFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Sessão expirada. Faça login novamente.');
      if (!empresaAtualId) throw new Error('Empresa não selecionada.');

      const hoje = new Date();
      const notificacoesParaCriar: Array<{ user_id: string; empresa_id: string; tipo: string; titulo: string; mensagem: string; entidade_tipo: string; entidade_id: string; lida: boolean; data_referencia: string }> = [];

      // 1. Períodos aquisitivos vencendo
      const periodosQuery: any = supabase
        .from('periodos_aquisitivos')
        .select('*, colaboradores:colaboradores!fk_periodos_aquisitivos_colaborador (id, nome_completo, status)')
        .eq('status', 'adquirido');
      const { data: periodos } = await periodosQuery.eq('empresa_id', empresaAtualId!);

      if (periodos) {
        for (const periodo of periodos) {
          const colaborador = periodo.colaboradores as ColaboradorRelation;
          if (!colaborador || colaborador.status !== 'ativo') continue;
          const dataFimConcessivo = addDays(parseISO(periodo.data_fim), 365);
          const diasRestantes = differenceInDays(dataFimConcessivo, hoje);
          if (diasRestantes <= 60 && diasRestantes > 0) {
            const { data: existente } = await supabase
              .from('notificacoes').select('id').eq('tipo', 'periodo_aquisitivo').eq('entidade_id', periodo.id).maybeSingle();
            if (!existente) {
              notificacoesParaCriar.push({
                user_id: currentUser.id, empresa_id: empresaAtualId,
                tipo: 'periodo_aquisitivo', titulo: 'Período de Férias Vencendo',
                mensagem: `O colaborador ${colaborador.nome_completo} tem férias vencendo em ${diasRestantes} dias (${format(dataFimConcessivo, "dd/MM/yyyy")}).`,
                entidade_tipo: 'colaborador', entidade_id: colaborador.id, lida: false,
                data_referencia: format(dataFimConcessivo, 'yyyy-MM-dd'),
              });
            }
          }
        }
      }

      // 2. Contratos temporários vencendo
      const { data: colaboradores } = await supabase
        .from('colaboradores')
        .select('id, nome_completo, tipo_contrato, data_admissao')
        .in('tipo_contrato', ['temporario', 'estagiario', 'aprendiz'])
        .eq('status', 'ativo')
        .eq('empresa_id', empresaAtualId);

      if (colaboradores) {
        for (const colab of colaboradores) {
          const duracaoContrato = colab.tipo_contrato === 'estagiario' ? 730 : colab.tipo_contrato === 'aprendiz' ? 730 : 180;
          const dataFimContrato = addDays(parseISO(colab.data_admissao), duracaoContrato);
          const diasRestantes = differenceInDays(dataFimContrato, hoje);
          if (diasRestantes <= 30 && diasRestantes > 0) {
            const { data: existente } = await supabase
              .from('notificacoes').select('id').eq('tipo', 'contrato_vencendo').eq('entidade_id', colab.id).maybeSingle();
            if (!existente) {
              notificacoesParaCriar.push({
                user_id: currentUser.id, empresa_id: empresaAtualId,
                tipo: 'contrato_vencendo', titulo: 'Contrato Vencendo',
                mensagem: `O contrato ${colab.tipo_contrato} de ${colab.nome_completo} vence em ${diasRestantes} dias (${format(dataFimContrato, "dd/MM/yyyy")}).`,
                entidade_tipo: 'colaborador', entidade_id: colab.id, lida: false,
                data_referencia: format(dataFimContrato, 'yyyy-MM-dd'),
              });
            }
          }
        }
      }

      // 3. CNH vencendo
      const { data: colaboradoresDoc } = await supabase
        .from('colaboradores')
        .select('id, nome_completo, cnh_validade')
        .not('cnh_validade', 'is', null)
        .eq('status', 'ativo')
        .eq('empresa_id', empresaAtualId);

      if (colaboradoresDoc) {
        for (const colab of colaboradoresDoc) {
          if (!colab.cnh_validade) continue;
          const dataValidade = parseISO(colab.cnh_validade);
          const diasRestantes = differenceInDays(dataValidade, hoje);
          if (diasRestantes <= 30 && diasRestantes > 0) {
            const { data: existente } = await supabase
              .from('notificacoes').select('id').eq('tipo', 'documento_vencendo').eq('entidade_id', colab.id).maybeSingle();
            if (!existente) {
              notificacoesParaCriar.push({
                user_id: currentUser.id, empresa_id: empresaAtualId,
                tipo: 'documento_vencendo', titulo: 'CNH Vencendo',
                mensagem: `A CNH de ${colab.nome_completo} vence em ${diasRestantes} dias (${format(dataValidade, "dd/MM/yyyy")}).`,
                entidade_tipo: 'colaborador', entidade_id: colab.id, lida: false,
                data_referencia: colab.cnh_validade,
              });
            }
          }
        }
      }

      // 4. Férias aprovadas próximas
      const { data: feriasProgramadas } = await supabase
        .from('ferias')
        .select('*, colaboradores:colaboradores!fk_ferias_colaborador (id, nome_completo)')
        .eq('status', 'aprovada')
        .eq('empresa_id', empresaAtualId);

      if (feriasProgramadas) {
        for (const ferias of feriasProgramadas) {
          const colaborador = ferias.colaboradores as ColaboradorRelation;
          if (!colaborador) continue;
          const dataInicio = parseISO(ferias.data_inicio);
          const diasAteInicio = differenceInDays(dataInicio, hoje);
          if (diasAteInicio <= 7 && diasAteInicio > 0) {
            const { data: existente } = await supabase
              .from('notificacoes').select('id').eq('tipo', 'ferias_vencendo').eq('entidade_id', ferias.id).maybeSingle();
            if (!existente) {
              notificacoesParaCriar.push({
                user_id: currentUser.id, empresa_id: empresaAtualId,
                tipo: 'ferias_vencendo', titulo: 'Férias Próximas',
                mensagem: `As férias de ${colaborador.nome_completo} começam em ${diasAteInicio} dias (${format(dataInicio, "dd/MM/yyyy")}).`,
                entidade_tipo: 'ferias', entidade_id: ferias.id, lida: false,
                data_referencia: ferias.data_inicio,
              });
            }
          }
        }
      }

      if (notificacoesParaCriar.length > 0) {
        const { error } = await supabase.from('notificacoes').insert(notificacoesParaCriar as any);
        if (error) throw error;
      }

      return notificacoesParaCriar.length;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const naoLidas = notificacoes.filter(n => !n.lida).length;
  const porTipo = {
    ferias_vencendo: notificacoes.filter(n => n.tipo === 'ferias_vencendo' && !n.lida).length,
    contrato_vencendo: notificacoes.filter(n => n.tipo === 'contrato_vencendo' && !n.lida).length,
    documento_vencendo: notificacoes.filter(n => n.tipo === 'documento_vencendo' && !n.lida).length,
    periodo_aquisitivo: notificacoes.filter(n => n.tipo === 'periodo_aquisitivo' && !n.lida).length,
  };

  return {
    notificacoes, isLoading, naoLidas, porTipo, refetch,
    marcarComoLida: marcarComoLida.mutate,
    marcarTodasComoLidas: marcarTodasComoLidas.mutate,
    excluirNotificacao: excluirNotificacao.mutate,
    limparAntigas: limparAntigas.mutate,
    gerarNotificacoesAutomaticas: gerarNotificacoesAutomaticas.mutate,
    criarNotificacao: criarNotificacao.mutateAsync,
    isGerando: gerarNotificacoesAutomaticas.isPending,
  };
}
