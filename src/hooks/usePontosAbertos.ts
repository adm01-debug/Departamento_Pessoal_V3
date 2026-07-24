import { useQuery } from '@tanstack/react-query';
import { pontoAbertoService } from '@/services/pontoAbertoService';
import { useEmpresas } from './useEmpresas';

export function usePontosAbertos() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const query = useQuery({
    queryKey: ['pontos_abertos', empresaId],
    queryFn: () => pontoAbertoService.listar(empresaId!),
    enabled: !!empresaId,
    refetchInterval: 60000, // Auto-refresh every minute
  });

  return {
    pontosAbertos: query.data || [],
    isLoading: query.isLoading,
    total: (query.data || []).length,
    refetch: query.refetch,
  };
}
