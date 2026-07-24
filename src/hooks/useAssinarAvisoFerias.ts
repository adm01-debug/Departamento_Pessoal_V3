import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts';
import { useEmpresas } from './useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { gerarAvisoFeriasPDF } from '@/utils/avisoFeriasPDF';

/**
 * Assina eletronicamente o Aviso de Férias:
 *   1) gera o PDF em memória
 *   2) calcula SHA-256 do conteúdo
 *   3) faz upload em ferias-avisos/{empresa_id}/{ferias_id}.pdf
 *   4) chama RPC assinar_aviso_ferias (atômica, aprova RH + auditoria)
 */
export function useAssinarAvisoFerias() {
  const { user } = useAuth();
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: {
      ferias: { id: string };
      colaborador: object;
      empresa: { id?: string };
    }) => {
      const empresaId = empresaAtual?.id || payload.empresa?.id;
      if (!empresaId) throw new Error('Empresa não selecionada');
      if (!payload.ferias?.id) throw new Error('Férias sem ID');

      // 1+2. Gera PDF e hash
      const pdf = await gerarAvisoFeriasPDF({
        ferias: payload.ferias,
        colaborador: payload.colaborador,
        empresa: payload.empresa,
        assinatura: {
          assinadoPor: user?.email || user?.id,
          assinadoEm: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
      });

      // 3. Upload
      const path = `${empresaId}/${payload.ferias.id}.pdf`;
      const { error: upErr } = await supabase.storage
        .from('ferias-avisos')
        .upload(path, pdf.blob, {
          upsert: true,
          contentType: 'application/pdf',
        });
      if (upErr) throw upErr;

      // 4. RPC de assinatura
      const { data, error } = await supabase.rpc('assinar_aviso_ferias', {
        p_ferias_id: payload.ferias.id,
        p_hash: pdf.hash,
        p_pdf_url: path,
        p_ip: null,
        p_ua: navigator.userAgent.substring(0, 500),
      });
      if (error) throw error;
      return { pdf, path, rpc: data };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ferias'] });
      toast.success('Aviso de férias assinado eletronicamente e RH aprovado.');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao assinar aviso de férias.')),
  });

  const baixarAvisoAssinado = async (empresaId: string, feriasId: string) => {
    const path = `${empresaId}/${feriasId}.pdf`;
    const { data, error } = await supabase.storage
      .from('ferias-avisos')
      .createSignedUrl(path, 60);
    if (error) {
      toast.error(safeErrorMessage(error, 'Erro ao gerar link do aviso.'));
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  return {
    assinar: mutation.mutateAsync,
    isSigning: mutation.isPending,
    baixarAvisoAssinado,
  };
}
