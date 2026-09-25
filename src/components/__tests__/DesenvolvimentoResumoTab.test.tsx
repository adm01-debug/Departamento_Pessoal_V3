import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks', () => ({
  useFormacoes: vi.fn(() => ({ data: [], isLoading: false })),
  useCertificadosColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useTreinamentosColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useFeedbacksColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  usePDIsColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useMetasColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useCompetenciasColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useOnboardingColaborador: vi.fn(() => ({
    onboarding: null, tarefas: [], concluidas: [], pendentes: [], atrasadas: [], progresso: null, isLoading: false,
  })),
  usePeriodoExperiencia: vi.fn(() => ({ data: null, isLoading: false })),
}));
vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }));
vi.mock('@/components/ui/progress', () => ({ Progress: () => <div data-testid="progress" /> }));

import { useOnboardingColaborador, useMetasColaborador, useCompetenciasColaborador } from '@/hooks';
import { DesenvolvimentoResumoTab } from '../colaborador-detalhes/DesenvolvimentoResumoTab';

describe('DesenvolvimentoResumoTab', () => {
  it('renders the four dashboard cards with empty states when there is no data', () => {
    render(<DesenvolvimentoResumoTab colaboradorId="col-1" />);
    expect(screen.getByText('Formação & Qualificações')).toBeInTheDocument();
    expect(screen.getByText('Treinamentos')).toBeInTheDocument();
    expect(screen.getByText('Desenvolvimento Profissional')).toBeInTheDocument();
    expect(screen.getByText('Jornada Interna')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma formação cadastrada.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum certificado cadastrado.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum treinamento registrado.')).toBeInTheDocument();
  });

  it('shows onboarding as concluded when progresso is 100%', () => {
    vi.mocked(useOnboardingColaborador).mockReturnValue({
      onboarding: { id: 'ob-1' }, tarefas: [{ id: 't1' }], concluidas: [{ id: 't1', data_conclusao: '2026-01-06' }],
      pendentes: [], atrasadas: [], progresso: 100, isLoading: false,
    } as any);
    render(<DesenvolvimentoResumoTab colaboradorId="col-1" />);
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('shows metas progress bar when metas exist', () => {
    vi.mocked(useMetasColaborador).mockReturnValue({
      data: [{ id: 'm1', titulo: 'Meta 1', progresso: 60, status: 'ativo' }],
      isLoading: false,
    } as any);
    render(<DesenvolvimentoResumoTab colaboradorId="col-1" />);
    expect(screen.getByTestId('progress')).toBeInTheDocument();
  });

  it('shows competência bars when competências exist', () => {
    vi.mocked(useCompetenciasColaborador).mockReturnValue({
      data: [{ id: 'c1', nome: 'Comunicação', percentual: 90 }],
      isLoading: false,
    } as any);
    render(<DesenvolvimentoResumoTab colaboradorId="col-1" />);
    expect(screen.getByText('Comunicação')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });
});
