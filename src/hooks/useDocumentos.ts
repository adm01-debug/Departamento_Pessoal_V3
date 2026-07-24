import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { useEmpresas } from '@/hooks/useEmpresas';

export function useDocumentos(colaboradorId?: string) {
  const queryClient = useQueryClient();
  const { empresaAtualId } = useEmpresas();

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos', empresaAtualId, colaboradorId],
    enabled: !!empresaAtualId,
    queryFn: async () => {
       
      let query: any = supabase
        .from('documentos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (empresaAtualId) query = query.eq('empresa_id', empresaAtualId);
      if (colaboradorId) query = query.eq('colaborador_id', colaboradorId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });

  const criarDocumento = useMutation({
    mutationFn: async (doc: { nome: string; tipo: string; colaborador_id?: string; url?: string; observacoes?: string; data_validade?: string }) => {
      const { data, error } = await supabase
        .from('documentos')
        .insert({ ...doc, ...(empresaAtualId ? { empresa_id: empresaAtualId } : {}) } as any)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      toast.success('Documento criado!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar documento.')),
  });

  const excluirDocumento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('documentos').delete().eq('id', id).eq('empresa_id', empresaAtualId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      toast.success('Documento excluído');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar documento.')),
  });

  const atualizarDocumento = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await (supabase as any)
        .from('documentos')
        .update(updates as any)
        .eq('id', id)
        .eq('empresa_id', empresaAtualId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      toast.success('Documento atualizado!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar documento.')),
  });

  return { documentos, isLoading, criarDocumento, excluirDocumento, atualizarDocumento };
}
