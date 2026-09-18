import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks', () => ({
  useCertificadosColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useTreinamentosColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useFeedbacksColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  usePDIsColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useMetasColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useOnboardingColaborador: vi.fn(() => ({
    onboarding: null, tarefas: [], concluidas: [], pendentes: [], atrasadas: [], progresso: null, isLoading: false,
  })),
}));
vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }));
vi.mock('@/components/ui/progress', () => ({ Progress: () => <div data-testid="progress" /> }));

import { useOnboardingColaborador } from '@/hooks';
import { DesenvolvimentoResumoTab } from '../colaborador-detalhes/DesenvolvimentoResumoTab';

describe('DesenvolvimentoResumoTab', () => {
  it('renders all section titles with empty states when there is no data', () => {
    render(<DesenvolvimentoResumoTab colaboradorId="col-1" />);
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Treinamentos')).toBeInTheDocument();
    expect(screen.getByText('Certificados')).toBeInTheDocument();
    expect(screen.getByText('Avaliação / Feedback 360')).toBeInTheDocument();
    expect(screen.getByText('PDI — Plano de Desenvolvimento Individual')).toBeInTheDocument();
    expect(screen.getByText('Metas / OKRs')).toBeInTheDocument();
  });

  it('shows onboarding progress when the colaborador has an active onboarding', () => {
    vi.mocked(useOnboardingColaborador).mockReturnValue({
      onboarding: { id: 'ob-1' }, tarefas: [{ id: 't1' }], concluidas: [{ id: 't1' }],
      pendentes: [], atrasadas: [], progresso: 100, isLoading: false,
    } as any);
    render(<DesenvolvimentoResumoTab colaboradorId="col-1" />);
    expect(screen.getByText('1/1 tarefas concluídas')).toBeInTheDocument();
    expect(screen.getByTestId('progress')).toBeInTheDocument();
  });
});
