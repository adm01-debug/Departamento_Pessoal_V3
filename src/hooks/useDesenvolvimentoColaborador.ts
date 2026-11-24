// PARTE G — Dossiê do Colaborador, aba Desenvolvimento (+ Onboarding).
// Hooks finos por colaborador_id sobre services já existentes
// (avaliacaoService, catalogoCursoService, rhService), sem duplicar lógica.
import { useQuery } from '@tanstack/react-query';
import { avaliacaoService } from '@/services/avaliacaoService';
import { catalogoCursoService } from '@/services/catalogoCursoService';
import { onboardingService, treinamentoParticipantesService } from '@/services/tabelas/rhService';
// FONTE CANÔNICA do onboarding (modelo A) — ver `onboardingJornadaService.ts`.
import { buscarJornadaDoColaborador, listarTarefasDaAdmissao } from '@/services/onboardingJornadaService';
import { useEmpresas } from './useEmpresas';
import { todayLocalISO } from '@/utils/dateLocal';
import {
  mockOr, getMockMetas, getMockPDIs, getMockFeedbacks, getMockCertificados,
  getMockTreinamentos, getMockOnboardingRegistro, getMockOnboardingTarefas,
  getMockCompetencias,
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

// Não existe hoje nenhuma tabela com nota/percentual de competência por
// colaborador (só `competencias_config`, um catálogo global de nomes) — fora
// do modo mock, resolve pra lista vazia em vez de chamar um serviço que não
// existe.
export function useCompetenciasColaborador(colaboradorId: string) {
  return useQuery({
    queryKey: ['competencias-colaborador', colaboradorId],
    queryFn: async () => mockOr(getMockCompetencias(colaboradorId)) ?? [],
    enabled: !!colaboradorId,
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

  /**
   * FONTE CANÔNICA (modelo A) — FASE 9.3 da consolidação: o dossiê do
   * colaborador passa a ler a MESMA jornada da `/onboarding`. O vínculo é o CPF
   * (`admissoes.cpf` ↔ `colaboradores.cpf`), porque `admissoes` não tem
   * `colaborador_id`.
   *
   * COMPAT TEMPORÁRIO (somente LEITURA): se o colaborador não tiver admissão
   * localizável, ainda lemos o modelo B (`onboarding_colaborador`) para que
   * NENHUM histórico já gravado desapareça. Isso NÃO é dual write — nada é
   * escrito nos dois lados — e sai assim que a conferência de dados do modelo B
   * for concluída (ver `docs/ONBOARDING_MODELO_B_DEPRECATED.md`).
   */
  const { data: onboarding, isLoading: isLoadingOnboarding } = useQuery({
    queryKey: ['onboarding-colaborador', colaboradorId, empresaAtual?.id],
    queryFn: async () => {
      const doMock = mockOr(getMockOnboardingRegistro(colaboradorId));
      if (doMock) return doMock;

      const canonica = await buscarJornadaDoColaborador(colaboradorId);
      if (canonica) return canonica;

      const legado = await onboardingService.buscarPorColaborador(colaboradorId, empresaAtual!.id);
      return legado ? { ...legado, fonte: 'legado' as const } : null;
    },
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });

  const onboardingId = (onboarding as { id?: string } | null | undefined)?.id;
  const fonte = (onboarding as { fonte?: 'jornada' | 'legado' } | null | undefined)?.fonte ?? 'jornada';

  const { data: tarefas, isLoading: isLoadingTarefas } = useQuery({
    queryKey: ['onboarding-tarefas-colaborador', onboardingId],
    queryFn: async () => {
      const doMock = mockOr(getMockOnboardingTarefas(onboardingId));
      if (doMock) return doMock;
      return fonte === 'legado'
        ? onboardingService.listarTarefas(onboardingId!)
        : listarTarefasDaAdmissao(onboardingId!);
    },
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
