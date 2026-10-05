import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { contratacaoService } from '@/services/contratacaoService';
import { safeErrorMessage } from '@/utils/safeError';
import { useEmpresas } from '@/hooks/useEmpresas';
import { validateTablePayload } from '@/schemas/validate';
import type { Updatable } from '@/integrations/supabase/database.types';

export function useContratacaoDigital() {
  const queryClient = useQueryClient();
  const { empresaAtual } = useEmpresas();

  const atualizarEtapa = useMutation({
    mutationFn: async ({ tokenId, campos }: { tokenId: string; campos: Updatable<'admissao_tokens'> }) => {
      const { data, error } = await supabase
        .from('admissao_tokens')
        .update(
          validateTablePayload(
            'admissao_tokens',
            {
              ...campos,
              updated_at: new Date().toISOString(),
            },
            'useContratacaoDigital:admissao_tokens'
          )
        )
        .eq('id', tokenId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratacao-token'] });
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro na contratação digital.')),
  });

  const validarDocumento = useMutation({
    mutationFn: async ({
      admissaoId,
      docType,
      status,
      observacao,
    }: {
      admissaoId: string;
      docType: string;
      status: 'validado' | 'rejeitado';
      observacao?: string;
    }) => {
      return await contratacaoService.validarDocumento(admissaoId, docType, status, observacao, empresaAtual?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissoes'] });
      queryClient.invalidateQueries({ queryKey: ['contratacao-token'] });
      toast.success('Validação do documento atualizada');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro na contratação digital.')),
  });

  return { atualizarEtapa, validarDocumento };
}
