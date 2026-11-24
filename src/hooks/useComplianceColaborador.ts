// PARTE I — Dossiê do Colaborador, aba Documentos & Compliance.
import { useQuery } from '@tanstack/react-query';
import { lgpdService } from '@/services/lgpdService';
import { useEmpresas } from './useEmpresas';
import { mockOr, getMockConsentimentosLGPD } from '@/mocks/colaboradoresMock';

export function useConsentimentosColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['lgpd-consentimentos-colaborador', colaboradorId, empresaAtual?.id],
    queryFn: async () => mockOr(getMockConsentimentosLGPD(colaboradorId)) ?? lgpdService.listarConsentimentos(empresaAtual!.id, colaboradorId),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}
