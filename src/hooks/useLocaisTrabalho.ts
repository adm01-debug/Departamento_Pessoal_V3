import { useGenericCrud } from './useGenericCrud';
import { localTrabalhoService } from '@/services/localTrabalhoService';
import { useEmpresas } from './useEmpresas';
import type { Tables } from '@/integrations/supabase/types';

export function useLocaisTrabalho() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const crud = useGenericCrud<Tables<'locais_trabalho'>>({
    queryKey: `locais_trabalho:${empresaId ?? 'none'}`,
    service: localTrabalhoService,
    initialPageSize: 10,
    filters: empresaId ? { empresa_id: empresaId } : {},
    empresaId: empresaId ?? undefined,
    successMessages: {
      create: 'Local de trabalho criado',
      update: 'Local de trabalho atualizado',
      delete: 'Local de trabalho excluído',
    },
  });

  return {
    ...crud,
    locais: crud.items,
    criar: (data: Record<string, unknown>) => crud.criar({ ...data, empresa_id: empresaId }),
  };
}
