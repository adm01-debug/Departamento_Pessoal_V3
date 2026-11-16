import { useQuery } from '@tanstack/react-query';
import { vinculoService } from '@/services/vinculoService';

/** Histórico completo de vínculos de um colaborador — usado no Dossiê. */
export function useVinculosColaborador(colaboradorId?: string) {
  return useQuery({
    queryKey: ['vinculos-colaborador', colaboradorId],
    queryFn: () => vinculoService.listarPorColaborador(colaboradorId),
    enabled: !!colaboradorId,
  });
}
