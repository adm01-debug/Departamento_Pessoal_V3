import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vinculoService, VinculosResumo } from '@/services/vinculoService';
import { colaboradorService } from '@/services/colaboradorService';
import { useEmpresas } from './useEmpresas';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

/**
 * Resumo de passagens (quantidadePassagens/quantidadeRecontratacoes/...) para
 * uma lista de colaboradores — usada pela listagem. Uma única query
 * `.in('colaborador_id', ids)` (ver vinculoService.contarPassagensPorColaboradores),
 * nunca uma query por linha.
 */
export function useVinculosResumo(colaboradorIds: string[]) {
  const sortedIds = [...colaboradorIds].sort();
  return useQuery({
    queryKey: ['vinculos-resumo', sortedIds],
    queryFn: () => vinculoService.contarPassagensPorColaboradores(sortedIds),
    enabled: sortedIds.length > 0,
    placeholderData: (prev) => prev,
  });
}

/** Histórico completo de vínculos de um colaborador — usado no Dossiê. */
export function useVinculosColaborador(colaboradorId?: string) {
  return useQuery({
    queryKey: ['vinculos-colaborador', colaboradorId],
    queryFn: () => vinculoService.listarPorColaborador(colaboradorId),
    enabled: !!colaboradorId,
  });
}

interface RecontratarInput {
  id: string;
  dados: { data_admissao: string; cargo?: string; departamento?: string; salario_base?: number };
}

export function useRecontratarColaborador() {
  const queryClient = useQueryClient();
  const { empresaAtual } = useEmpresas();

  return useMutation({
    mutationFn: ({ id, dados }: RecontratarInput) => {
      if (!empresaAtual?.id) throw new Error('Nenhuma empresa selecionada.');
      return colaboradorService.recontratar(id, dados, empresaAtual.id);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['colaborador', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-summary'] });
      queryClient.invalidateQueries({ queryKey: ['vinculos-resumo'] });
      queryClient.invalidateQueries({ queryKey: ['vinculos-colaborador', vars.id] });
      toast.success('Colaborador recontratado com sucesso');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao recontratar colaborador.')),
  });
}

export type { VinculosResumo };
