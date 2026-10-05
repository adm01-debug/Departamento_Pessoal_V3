import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { useEmpresas } from '@/hooks/useEmpresas';
import type { Insertable, Updatable } from '@/integrations/supabase/database.types';
import { validateInput, validateTablePayload } from '@/schemas/validate';
import { documentoSchema } from '@/schemas/documento';

export function useDocumentos(colaboradorId?: string) {
  const queryClient = useQueryClient();
  const { empresaAtualId } = useEmpresas();

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos', empresaAtualId, colaboradorId],
    enabled: !!empresaAtualId,
    queryFn: async () => {
      let query = supabase.from('documentos').select('*').order('created_at', { ascending: false }).limit(500);
      if (empresaAtualId) query = query.eq('empresa_id', empresaAtualId);
      if (colaboradorId) query = query.eq('colaborador_id', colaboradorId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const criarDocumento = useMutation({
    mutationFn: async (doc: Omit<Insertable<'documentos'>, 'empresa_id'>) => {
      const payload = { ...doc, ...(empresaAtualId ? { empresa_id: empresaAtualId } : {}) };
      validateInput(documentoSchema, payload, 'useDocumentos:criarDocumento');
      const { data, error } = await supabase
        .from('documentos')
        .insert(validateTablePayload('documentos', payload, 'useDocumentos:documentos'))
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
      const { error } = await supabase.from('documentos').delete().eq('id', id).eq('empresa_id', empresaAtualId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      toast.success('Documento excluído');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar documento.')),
  });

  const atualizarDocumento = useMutation({
    mutationFn: async ({ id, ...updates }: Updatable<'documentos'> & { id: string }) => {
      const { data, error } = await supabase
        .from('documentos')
        .update(validateTablePayload('documentos', updates, 'useDocumentos:documentos'))
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
