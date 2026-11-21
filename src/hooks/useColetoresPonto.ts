import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coletoresService } from '@/services/relogio/coletoresService';

export const coletoresKeys = {
  coletores: (empresaId: string) => ['relogio-coletores', empresaId] as const,
  lotes: (empresaId: string) => ['relogio-lotes', empresaId] as const,
};

export function useColetoresPonto(empresaId: string | null | undefined) {
  return useQuery({
    queryKey: coletoresKeys.coletores(empresaId ?? ''),
    queryFn: () => coletoresService.listarColetores(empresaId as string),
    enabled: !!empresaId,
  });
}

export function useLotesColetores(empresaId: string | null | undefined) {
  return useQuery({
    queryKey: coletoresKeys.lotes(empresaId ?? ''),
    queryFn: () => coletoresService.listarLotes(empresaId as string),
    enabled: !!empresaId,
  });
}

export function useGerarTokenColetor(empresaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ unidade, nome }: { unidade: string; nome: string }) =>
      coletoresService.gerarToken(empresaId, unidade, nome),
    onSuccess: () => qc.invalidateQueries({ queryKey: coletoresKeys.coletores(empresaId) }),
  });
}

export function useRevogarColetor(empresaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dispositivoId: string) => coletoresService.revogar(dispositivoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: coletoresKeys.coletores(empresaId) }),
  });
}
