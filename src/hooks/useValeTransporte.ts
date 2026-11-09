import { useQuery } from '@tanstack/react-query';
import { valeTransporteService } from '@/services/calculoBeneficiosService';

export function useValeTransporte(colaboradorId?: string, diasUteis = 22) {
  const query = useQuery({
    queryKey: ['vale-transporte', colaboradorId, diasUteis],
    enabled: !!colaboradorId,
    queryFn: () => valeTransporteService.calcularCustoMensal(colaboradorId!, diasUteis),
  });

  return {
    custo: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
