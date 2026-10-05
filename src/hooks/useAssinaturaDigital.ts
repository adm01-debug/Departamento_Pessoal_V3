import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { validateTablePayload } from '@/schemas/validate';

export function useAssinaturaDigital() {
  const queryClient = useQueryClient();

  const assinarContrato = useMutation({
    mutationFn: async ({ tokenId, ip, userAgent }: { tokenId: string; ip?: string; userAgent?: string }) => {
      const { data, error } = await supabase
        .from('admissao_tokens')
        .update(
          validateTablePayload(
            'admissao_tokens',
            {
              contrato_assinado: true,
              assinado_em: new Date().toISOString(),
              ip_assinatura: ip || null,
            },
            'useAssinaturaDigital:admissao_tokens'
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
      queryClient.invalidateQueries({ queryKey: ['assinaturas-digitais'] });
      toast.success('Assinatura digital realizada com sucesso');
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Erro ao assinar contrato.')),
  });

  return { assinarContrato };
}
