import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { colaboradorLotacaoService } from '@/services/colaboradorLotacaoService';

export const chaveCatalogoLotacoes = (empresaId?: string) => ['lotacoes:catalogo', empresaId ?? 'none'];
export const chaveLotacoesDoColaborador = (colaboradorId?: string, empresaId?: string) => [
  'colaborador_lotacoes',
  colaboradorId ?? 'none',
  empresaId ?? 'none',
];

/** Catálogo de lotações ativas da empresa (para escolher a principal). */
export function useLotacoesCatalogo(empresaId?: string) {
  return useQuery({
    queryKey: chaveCatalogoLotacoes(empresaId),
    queryFn: () => colaboradorLotacaoService.listarCatalogo(empresaId!),
    enabled: !!empresaId,
  });
}

/** Lotação principal do colaborador — `null` quando ainda não há vínculo. */
export function useLotacaoPrincipal(colaboradorId?: string, empresaId?: string) {
  return useQuery({
    queryKey: [...chaveLotacoesDoColaborador(colaboradorId, empresaId), 'principal'],
    queryFn: () => colaboradorLotacaoService.buscarPrincipal(colaboradorId!, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });
}

/** Todos os vínculos do colaborador, principal primeiro. */
export function useLotacoesDoColaborador(colaboradorId?: string, empresaId?: string) {
  return useQuery({
    queryKey: chaveLotacoesDoColaborador(colaboradorId, empresaId),
    queryFn: () => colaboradorLotacaoService.listarPorColaborador(colaboradorId!, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });
}

export function useDefinirLotacaoPrincipal(colaboradorId?: string, empresaId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lotacaoId: string) =>
      colaboradorLotacaoService.definirPrincipal(colaboradorId!, lotacaoId, empresaId!),
    onSuccess: () => {
      // Invalida a lista e a principal: a chave da principal é a da lista + um
      // segmento, então o prefixo cobre as duas.
      queryClient.invalidateQueries({ queryKey: chaveLotacoesDoColaborador(colaboradorId, empresaId) });
      toast.success('Lotação principal atualizada.');
    },
    onError: (erro: unknown) => {
      const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido';
      toast.error(`Não foi possível atualizar a lotação principal: ${mensagem}`);
    },
  });
}
