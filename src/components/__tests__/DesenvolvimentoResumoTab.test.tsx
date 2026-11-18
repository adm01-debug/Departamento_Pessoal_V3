import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { useOnboardingColaborador, useMetasColaborador, useCompetenciasColaborador } from '@/hooks';

// Tipos vindos dos próprios hooks do repo: `useOnboardingColaborador` devolve
// um objeto agregado, e os outros dois são `useQuery` — destes, os cards só
// consomem `data`/`isLoading`, então o mock declara exatamente esse recorte.
type OnboardingResult = ReturnType<typeof useOnboardingColaborador>;
type MetasResult = Pick<ReturnType<typeof useMetasColaborador>, 'data' | 'isLoading'>;
type CompetenciasResult = Pick<ReturnType<typeof useCompetenciasColaborador>, 'data' | 'isLoading'>;

const mocks = vi.hoisted(() => ({
  useOnboardingColaborador: vi.fn((): OnboardingResult => ({
    onboarding: null,
    tarefas: [],
    concluidas: [],
    pendentes: [],
    atrasadas: [],
    progresso: null,
    isLoading: false,
    isError: false,
  })),
  useMetasColaborador: vi.fn((): MetasResult => ({ data: [], isLoading: false })),
  useCompetenciasColaborador: vi.fn((): CompetenciasResult => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks', () => ({
  useFormacoes: vi.fn(() => ({ data: [], isLoading: false })),
  useCriarFormacao: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCertificadosColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useTreinamentosColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useFeedbacksColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  usePDIsColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useMetasColaborador: mocks.useMetasColaborador,
  useCompetenciasColaborador: mocks.useCompetenciasColaborador,
  useOnboardingColaborador: mocks.useOnboardingColaborador,
  usePeriodoExperiencia: vi.fn(() => ({ data: null, isLoading: false })),
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));
vi.mock('@/services', () => ({
  catalogoCursoService: { listarInscricoesPorColaborador: vi.fn(async () => []) },
}));
vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }));

import { DesenvolvimentoResumoTab } from '../colaborador-detalhes/DesenvolvimentoResumoTab';

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DesenvolvimentoResumoTab colaboradorId="col-1" />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DesenvolvimentoResumoTab', () => {
  it('renders the four dashboard cards with empty states when there is no data', async () => {
    renderTab();
    expect(screen.getByText('Formação & Qualificações')).toBeInTheDocument();
    expect(screen.getByText('Treinamentos')).toBeInTheDocument();
    expect(screen.getByText('Desenvolvimento Profissional')).toBeInTheDocument();
    expect(screen.getByText('Jornada Interna')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma formação cadastrada.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum certificado cadastrado.')).toBeInTheDocument();
    expect(await screen.findByText('Nenhum treinamento registrado.')).toBeInTheDocument();
  });

  it('shows onboarding as concluded when progresso is 100%', () => {
    mocks.useOnboardingColaborador.mockReturnValue({
      onboarding: { id: 'ob-1' },
      tarefas: [{ concluida: true, data_conclusao: '2026-01-06' }],
      concluidas: [{ concluida: true, data_conclusao: '2026-01-06' }],
      pendentes: [],
      atrasadas: [],
      progresso: 100,
      isLoading: false,
      isError: false,
    });
    renderTab();
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('shows metas progress when metas exist', () => {
    mocks.useMetasColaborador.mockReturnValue({
      data: [{ id: 'm1', titulo: 'Meta 1', progresso: 60, status: 'ativo' }],
      isLoading: false,
    });
    renderTab();
    expect(screen.getByText('1 ativas')).toBeInTheDocument();
    expect(screen.getByText('de 1 no total')).toBeInTheDocument();
    expect(screen.getByText('60% de conclusão')).toBeInTheDocument();
  });

  it('shows competência bars when competências exist', () => {
    mocks.useCompetenciasColaborador.mockReturnValue({
      data: [{ id: 'c1', nome: 'Comunicação', percentual: 90 }],
      isLoading: false,
    });
    renderTab();
    expect(screen.getByText('Comunicação')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });
});
