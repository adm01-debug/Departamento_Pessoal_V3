import { useGenericCrud } from './useGenericCrud';
import { empresaService } from '@/services/empresaService';
import { Empresa } from '@/types/entities';

export function useTodasEmpresas() {
  const crud = useGenericCrud<Empresa>({
    queryKey: 'todas-empresas-list',
    service: empresaService,
    initialPageSize: 12,
    successMessages: {
      create: 'Empresa criada',
      update: 'Empresa atualizada',
      delete: 'Empresa excluída'
    }
  });

  return {
    ...crud,
    empresas: crud.items,
  };
}
