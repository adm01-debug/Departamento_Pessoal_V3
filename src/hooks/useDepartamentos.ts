import { useGenericCrud } from './useGenericCrud';
import { departamentoService } from '@/services/departamentoService';
import { useEmpresas } from './useEmpresas';
import type { Departamento } from '@/types/entities';

interface UseDepartamentosOptions {
  /**
   * Sobrescreve o pageSize inicial (padrão: 10, usado pela tela
   * administrativa). Dropdowns de filtro que precisam listar todos os
   * registros da empresa passam um valor maior (limitado a 100 pelo
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
      delete: 'Departamento excluído',
    },
  });

  return {
    ...crud,
    // Com `enabled: !!empresaId` a query fica desabilitada enquanto a empresa
    // nao resolve, e o react-query devolve isLoading=false — a tela trocaria o
    // skeleton pelo estado vazio. Sem empresa resolvida, ainda e carregando.
    isLoading: crud.isLoading || !empresaId,
    departamentos: crud.items,
    empresaId,
  };
}
