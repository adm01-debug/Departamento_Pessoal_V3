import { useQuery } from '@tanstack/react-query';
import { beneficioService } from '@/services/beneficioService';
import { useEmpresas } from './useEmpresas';
import { useGenericCrud } from './useGenericCrud';

export function useBeneficios() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  // IMPORTANTE: `empresaId` é passado nas duas formas — como parâmetro dedicado
  // (destrava `enabled` em useGenericCrud, que ignora `empresa_id`/`empresaId`
  // dentro de `filters`) e dentro de `filters` apenas quando definido.
  // Sem isso, a query nunca dispara e a página exibe lista vazia.
  const crud = useGenericCrud<unknown>({
    // Inclui empresaId na queryKey para evitar reuso de cache cross-tenant.
    queryKey: `beneficios:${empresaId ?? 'none'}`,
    service: beneficioService,
    filters: empresaId ? { empresa_id: empresaId } : {},
    empresaId: empresaId ?? undefined,
  });

  const resumoQuery = useQuery({
    queryKey: ['beneficios-resumo', empresaId],
    queryFn: () => beneficioService.obterResumoCustos(empresaId!),
    enabled: !!empresaId,
  });

  return {
    ...crud,
    beneficios: crud.items,
    resumo: resumoQuery.data || {},
    isLoading: crud.isLoading || resumoQuery.isLoading,
    criarBeneficio: {
      mutateAsync: (data: unknown) => crud.criar(data),
      mutate: crud.criarMutate,
      isPending: crud.isCreating,
    },
    atualizarBeneficio: {
      mutateAsync: (args: { id: string; dados: unknown }) => crud.atualizar({ id: args.id, data: args.dados }),
      isPending: crud.isUpdating,
    },
    excluirBeneficio: {
      mutateAsync: (id: string) => crud.excluir(id),
      isPending: crud.isDeleting,
    },
    tiposBeneficio: ['transporte', 'alimentacao', 'saude', 'vida', 'outros'],
  };
}
