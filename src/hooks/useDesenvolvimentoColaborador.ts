// PARTE G — Dossiê do Colaborador, aba Desenvolvimento (+ Onboarding).
// Hooks finos por colaborador_id sobre services já existentes
// (avaliacaoService, catalogoCursoService, rhService), sem duplicar lógica.
import { useQuery } from '@tanstack/react-query';
import { avaliacaoService } from '@/services/avaliacaoService';
import { catalogoCursoService } from '@/services/catalogoCursoService';
import { onboardingService, treinamentoParticipantesService } from '@/services/tabelas/rhService';
import { useEmpresas } from './useEmpresas';
import { todayLocalISO } from '@/utils/dateLocal';
import {
  mockOr, getMockMetas, getMockPDIs, getMockFeedbacks, getMockCertificados,
  getMockTreinamentos, getMockOnboardingRegistro, getMockOnboardingTarefas,
} from '@/mocks/colaboradoresMock';

export function useMetasColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['metas-colaborador', colaboradorId, empresaAtual?.id],
    queryFn: async () => mockOr(getMockMetas(colaboradorId)) ?? avaliacaoService.listarMetas(empresaAtual!.id, colaboradorId),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function usePDIsColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['pdis-colaborador', colaboradorId, empresaAtual?.id],
    queryFn: async () => mockOr(getMockPDIs(colaboradorId)) ?? avaliacaoService.listarPDIs(empresaAtual!.id, colaboradorId),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useFeedbacksColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['feedbacks-colaborador', colaboradorId, empresaAtual?.id],
    queryFn: async () => mockOr(getMockFeedbacks(colaboradorId)) ?? avaliacaoService.listarFeedbacks(empresaAtual!.id, colaboradorId),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useCertificadosColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['certificados-colaborador', colaboradorId, empresaAtual?.id],
    queryFn: async () => mockOr(getMockCertificados(colaboradorId)) ?? catalogoCursoService.listarCertificados(empresaAtual!.id, colaboradorId),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useTreinamentosColaborador(colaboradorId: string) {
  return useQuery({
    queryKey: ['treinamentos-colaborador', colaboradorId],
    queryFn: async () => mockOr(getMockTreinamentos(colaboradorId)) ?? treinamentoParticipantesService.listarPorColaborador(colaboradorId),
    enabled: !!colaboradorId,
  });
}

// Onboarding: acha o registro do colaborador, depois suas tarefas, e calcula
// o progresso com a mesma fórmula já usada em OnboardingPage.tsx.
export function useOnboardingColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();

  const { data: onboarding, isLoading: isLoadingOnboarding } = useQuery({
    queryKey: ['onboarding-colaborador', colaboradorId, empresaAtual?.id],
    queryFn: async () => mockOr(getMockOnboardingRegistro(colaboradorId)) ?? onboardingService.buscarPorColaborador(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });

  const onboardingId = (onboarding as { id?: string } | null | undefined)?.id;

  const { data: tarefas, isLoading: isLoadingTarefas } = useQuery({
    queryKey: ['onboarding-tarefas-colaborador', onboardingId],
    queryFn: async () => mockOr(getMockOnboardingTarefas(onboardingId)) ?? onboardingService.listarTarefas(onboardingId!),
    enabled: !!onboardingId,
  });

  const lista = (tarefas as { concluida?: boolean; data_prazo?: string }[] | undefined) || [];
  const concluidas = lista.filter(t => t.concluida);
  const hoje = todayLocalISO();
  const atrasadas = lista.filter(t => !t.concluida && t.data_prazo && t.data_prazo < hoje);
  const pendentes = lista.filter(t => !t.concluida && !(t.data_prazo && t.data_prazo < hoje));
  const progresso = lista.length ? Math.round((concluidas.length / lista.length) * 100) : null;

  return {
    onboarding,
    tarefas: lista,
    concluidas,
    pendentes,
    atrasadas,
    progresso,
    isLoading: isLoadingOnboarding || isLoadingTarefas,
  };
}
