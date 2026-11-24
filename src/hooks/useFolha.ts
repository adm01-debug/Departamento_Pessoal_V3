import { useEmpresas } from './useEmpresas';
import { useGenericCrud } from './useGenericCrud';
import { folhaService } from '@/services/folhaService';

export function useFolha(competencia?: string) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const crud = useGenericCrud<unknown>({
    queryKey: 'folhas',
    service: folhaService,
    filters: { empresa_id: empresaId, competencia },
  });

  return {
    ...crud,
    folhas: crud.items,
  };
}
