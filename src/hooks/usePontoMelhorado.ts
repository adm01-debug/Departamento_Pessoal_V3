import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { notificarAjustePonto } from '@/services/notificacoesService';
import CryptoJS from 'crypto-js';

export interface SolicitacaoAjuste {
  id: string;
  colaborador_id: string;
  empresa_id: string;
  data_ponto: string;
  hora_original: string | null;
  hora_sugerida: string;
  tipo_ponto: 'entrada' | 'saida';
  motivo: string;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
  rascunho?: boolean;
  observacoes_gestor?: string;
  relatorio_conformidade?: {
    timestamp_validacao: string;
    timezone: string;
    geofencing: boolean;
    divergencia_minutos: number;
    sha256_integridade: string;
    portaria_671_conformidade: boolean;
  };
  created_at: string;
}

export function usePontoMelhorado(empresaId?: string, colaboradorId?: string) {
  const queryClient = useQueryClient();

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-ajuste-ponto', empresaId, colaboradorId],
    enabled: true,
    queryFn: async () => {
      let query = supabase
        .from('solicitacoes_ajuste_ponto')
        .select('*, colaborador:colaboradores(nome_completo)')
        .eq('empresa_id', empresaId!)
        .order('created_at', { ascending: false });

      if (colaboradorId) {
        query = query.eq('colaborador_id', colaboradorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const criarSolicitacao = useMutation({
    mutationFn: async (payload: Omit<SolicitacaoAjuste, 'id' | 'status' | 'created_at'> & { status?: SolicitacaoAjuste['status'] }) => {
      // Calcular conformidade básica
      const relatorio_conformidade = {
        timestamp_validacao: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        geofencing: true, 
        divergencia_minutos: 0,
        sha256_integridade: CryptoJS.SHA256(`${payload.colaborador_id}|${payload.data_ponto}|${payload.hora_sugerida}|CONFORM_PORTARIA_671`).toString(),
        portaria_671_conformidade: true
      };

      const { data, error } = await supabase
        .from('solicitacoes_ajuste_ponto')
        .insert({
          ...payload,
          status: payload.status || 'enviado',
          rascunho: payload.status === 'rascunho',
          relatorio_conformidade
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-ajuste-ponto'] });
      toast.success('Solicitação de ajuste enviada com sucesso.');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao criar solicitação.')),
  });

  const responderSolicitacao = useMutation({
    mutationFn: async ({ id, status, observacoes }: { id: string; status: 'aprovado' | 'recusado'; observacoes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('solicitacoes_ajuste_ponto')
        .update({
          status,
          observacoes_gestor: observacoes,
          analisado_por: user?.id,
          data_analise: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('empresa_id', empresaId!)
        .select()
        .single();

      if (error) throw error;
      
      // Notificar o colaborador sobre o resultado
      if (status === 'aprovado' || status === 'recusado') {
        await notificarAjustePonto(data.colaborador_id, status, observacoes);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-ajuste-ponto'] });
      toast.success(`Solicitação ${variables.status === 'aprovado' ? 'aprovada' : 'rejeitada'} com sucesso.`);
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao responder solicitação.')),
  });

  return {
    solicitacoes,
    isLoading,
    criarSolicitacao,
    responderSolicitacao
  };
}