import { useEmpresas } from './useEmpresas';
import { useGenericCrud } from './useGenericCrud';
import { folhaService, type FolhaRecord } from '@/services/folhaService';

export function useFolha(competencia?: string) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const crud = useGenericCrud<FolhaRecord>({
    queryKey: 'folhas',
    service: folhaService,
    filters: { empresa_id: empresaId, competencia },
  });

  return {
    ...crud,
    folhas: crud.items,
  };
}
