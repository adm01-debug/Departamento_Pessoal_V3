import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colaboradorLotacaoService } from '@/services/colaboradorLotacaoService';

/** Catálogo de lotações ativas da empresa — opções do Select "Unidade /
 * Lotação principal" na aba Profissional. */
export function useLotacoesCatalogo(empresaId?: string) {
  return useQuery({
    queryKey: ['lotacoes-catalogo', empresaId],
    queryFn: () => colaboradorLotacaoService.listarCatalogo(empresaId!),
    enabled: !!empresaId,
  });
}

/** Lotação principal do colaborador — mesma fonte usada pelo card "Vínculo
 * & Alocação" (TrabalhoHierarquiaTab.tsx) e pela aba Profissional ao
 * pré-preencher o Select em edição. */
export function useLotacaoPrincipal(colaboradorId?: string, empresaId?: string) {
  return useQuery({
    queryKey: ['lotacao-principal', colaboradorId, empresaId],
    queryFn: () => colaboradorLotacaoService.buscarPrincipal(colaboradorId!, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });
}

export function useDefinirLotacaoPrincipal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ colaboradorId, lotacaoId, empresaId }: { colaboradorId: string; lotacaoId: string; empresaId: string }) =>
      colaboradorLotacaoService.definirPrincipal(colaboradorId, lotacaoId, empresaId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lotacao-principal', variables.colaboradorId] });
    },
  });
}
