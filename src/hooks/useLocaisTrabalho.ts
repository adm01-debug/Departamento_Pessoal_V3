import { useGenericCrud } from './useGenericCrud';
import { localTrabalhoService } from '@/services/localTrabalhoService';
import { useEmpresas } from './useEmpresas';
import { getMockLocaisTrabalho } from '@/mocks/colaboradoresMock';

interface UseLocaisTrabalhoOptions {
  /**
   * Sobrescreve o pageSize inicial (padrão: 10, usado pela tela administrativa
   * de Locais de Trabalho). Dropdowns de filtro que precisam listar todos os
   * locais da empresa podem passar um valor maior (limitado a 100 pelo
   * BaseService) sem afetar a paginação padrão das demais telas — mesmo
   * padrão de `useCargos`/`useDepartamentos`.
   */
  pageSize?: number;
}

export function useLocaisTrabalho(options: UseLocaisTrabalhoOptions = {}) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const crud = useGenericCrud<unknown>({
    queryKey: `locais_trabalho:${empresaId ?? 'none'}`,
    service: localTrabalhoService,
    initialPageSize: options.pageSize ?? 10,
    filters: empresaId ? { empresa_id: empresaId } : {},
    empresaId: empresaId ?? undefined,
    successMessages: {
      create: 'Local de trabalho criado',
      update: 'Local de trabalho atualizado',
      delete: 'Local de trabalho excluído'
    }
  });

  // Empresa fictícia (VITE_COLABORADORES_MOCK): sem isso, o Select "Local de
  // trabalho" do formulário de colaborador fica vazio no modo demo (mesmo
  // padrão de useCargos.ts/useDepartamentos.ts). Só entra quando a consulta
  // real não trouxe nada, nunca esconde locais reais.
  const mockLocais = crud.items.length === 0 ? getMockLocaisTrabalho(empresaId) : undefined;

  return {
    ...crud,
    locais: mockLocais ?? crud.items,
    criar: (data: any) => crud.criar({ ...data, empresa_id: empresaId }),
  };
}
