import { useGenericCrud } from './useGenericCrud';
import { cargoService } from '@/services/cargoService';
import { useEmpresas } from './useEmpresas';
import { Cargo } from '@/types/entities';
import { getMockCargos } from '@/mocks/colaboradoresMock';

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

  // Empresa fictícia (VITE_COLABORADORES_MOCK): `cargos` reais não existem no
  // banco para o `empresa_id` fictício — sem isso, o select de Cargo do
  // formulário de colaborador fica vazio no modo demo. Só entra quando a
  // consulta real não trouxe nada, nunca esconde cargos reais.
  const mockCargos = crud.items.length === 0 ? getMockCargos(empresaId) : undefined;

  return {
    ...crud,
    cargos: (mockCargos as Cargo[] | undefined) ?? crud.items,
    criar: (data: any) => crud.criar({ ...data, empresa_id: empresaId }),
  };
}
