import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from './useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function useAdmissaoWorkflow(admissaoId?: string) {
  const queryClient = useQueryClient();
  const { empresaAtualId } = useEmpresas();

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['admissao-workflow', admissaoId],
    enabled: !!admissaoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows_execucoes')
        .select('*, workflow:workflows_definicoes(*), historico:workflows_historico(*)')
        .eq('entidade_id', admissaoId || '')
        .eq('entidade_tipo', 'admissao')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const iniciarWorkflow = useMutation({
    mutationFn: async (dados: { workflow_id: string }) => {
      const { data: execucao, error: execError } = await supabase
        .from('workflows_execucoes')
        .insert({
          workflow_id: dados.workflow_id,
          empresa_id: empresaAtualId,
          entidade_id: admissaoId || '',
          entidade_tipo: 'admissao',
          status: 'em_andamento',
          etapa_atual: 1,
          metadata: { iniciado_em: new Date().toISOString() }
        } as any)
        .select()
        .single();

      if (execError) throw execError;

      // Atualiza o status da admissão para 'documentos' (etapa inicial comum)
      if (admissaoId) {
        const { error: admissaoUpdateError } = await supabase
          .from('admissoes')
          .update({
            etapa: 'documentos' as any
          })
          .eq('id', admissaoId)
          .eq('empresa_id', empresaAtualId!);
        if (admissaoUpdateError) throw admissaoUpdateError;
      }

      // Automatically send link to candidate if email is present
      const { data: admissao } = await supabase
        .from('admissoes')
        .select('email')
        .eq('id', admissaoId || '')
        .single();
      
      if (admissao?.email) {
        const bytes = new Uint8Array(24);
        crypto.getRandomValues(bytes);
        const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const token = Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
        const expiracao = new Date();
        expiracao.setDate(expiracao.getDate() + 7);

        const { error: tokenError } = await supabase
          .from('admissao_tokens')
          .insert({
            admissao_id: admissaoId || '',
            token: token,
            email_candidato: admissao.email,
            data_expiracao: expiracao.toISOString(),
          });
        if (tokenError) throw tokenError;
      }

      // Registra o início no histórico
      await supabase.from('workflows_historico').insert({
        execucao_id: execucao.id,
        acao: 'Workflow iniciado',
        observacoes: 'Workflow de admissão iniciado automaticamente.'
      });

      return execucao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissao-workflow', admissaoId] });
      queryClient.invalidateQueries({ queryKey: ['admissoes'] });
      toast.success('Workflow de admissão iniciado com sucesso');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro no workflow de admissão.')),
  });

  const avancarEtapa = useMutation({
    mutationFn: async ({ execucaoId, proximaEtapa, observacao }: { execucaoId: string, proximaEtapa: number, observacao?: string }) => {
      const { data: execucao, error: execError } = await supabase
        .from('workflows_execucoes')
        .update({
          etapa_atual: proximaEtapa,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', execucaoId)
        .eq('empresa_id', empresaAtualId!)
        .select()
        .single();

      if (execError) throw execError;

      await supabase.from('workflows_historico').insert({
        execucao_id: execucaoId,
        acao: `Mudança para Etapa ${proximaEtapa}`,
        observacoes: observacao || `Avanço para a etapa ${proximaEtapa}`
      });

      return execucao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissao-workflow', admissaoId] });
      toast.success('Progresso do workflow atualizado');
    },
  });

  return { workflow, isLoading, iniciarWorkflow, avancarEtapa };
}
