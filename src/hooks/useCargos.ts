import { useGenericCrud } from './useGenericCrud';
import { cargoService } from '@/services/cargoService';
import { useEmpresas } from './useEmpresas';
import { Cargo } from '@/types/entities';

interface UseCargosOptions {
  /**
   * Sobrescreve o pageSize inicial (padrão: 15, usado pela tela administrativa
   * de Cargos). Dropdowns de filtro que precisam listar todos os cargos da
   * empresa podem passar um valor maior (limitado a 100 pelo BaseService) sem
   * afetar a paginação padrão das demais telas.
   */
  pageSize?: number;
}

export function useCargos(options: UseCargosOptions = {}) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const crud = useGenericCrud<Cargo>({
    queryKey: `cargos:${empresaId ?? 'none'}`,
    service: cargoService,
    initialPageSize: options.pageSize ?? 15,
    enabled: !!empresaId,
    filters: empresaId ? { empresa_id: empresaId } : {},
    empresaId: empresaId ?? undefined,
    successMessages: {
      create: 'Cargo criado com sucesso',
      update: 'Cargo atualizado',
      delete: 'Cargo excluído'
    }
  });

  return {
    ...crud,
    cargos: crud.items,
    criar: (data: any) => crud.criar({ ...data, empresa_id: empresaId }),
  };
}
