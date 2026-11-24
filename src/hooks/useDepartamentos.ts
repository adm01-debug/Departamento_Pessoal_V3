import { useGenericCrud } from './useGenericCrud';
import { departamentoService } from '@/services/departamentoService';
import { useEmpresas } from './useEmpresas';
import { Departamento } from '@/types/entities';
import { getMockDepartamentos } from '@/mocks/colaboradoresMock';

interface UseDepartamentosOptions {
  /**
   * Sobrescreve o pageSize inicial (padrão: 10, usado pela tela administrativa
   * de Departamentos). Dropdowns de filtro que precisam listar todos os
   * departamentos da empresa podem passar um valor maior (limitado a 100 pelo
   * BaseService) sem afetar a paginação padrão das demais telas.
   */
  pageSize?: number;
}

export function useDepartamentos(options: UseDepartamentosOptions = {}) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const crud = useGenericCrud<Departamento>({
    queryKey: `departamentos:${empresaId ?? 'none'}`,
    service: departamentoService,
    initialPageSize: options.pageSize ?? 10,
    enabled: !!empresaId,
    filters: empresaId ? { empresa_id: empresaId } : {},
    empresaId: empresaId ?? undefined,
    successMessages: {
      create: 'Departamento criado com sucesso',
      update: 'Departamento atualizado',
      delete: 'Departamento excluído'
    }
  });

  // Empresa fictícia (VITE_COLABORADORES_MOCK): `departamentos` reais não
  // existem no banco para o `empresa_id` fictício — sem isso, o select de
  // Departamento do formulário de colaborador fica vazio no modo demo. Só
  // entra quando a consulta real não trouxe nada, nunca esconde
  // departamentos reais.
  const mockDepartamentos = crud.items.length === 0 ? getMockDepartamentos(empresaId) : undefined;

  return {
    ...crud,
    departamentos: (mockDepartamentos as Departamento[] | undefined) ?? crud.items,
  };
}
