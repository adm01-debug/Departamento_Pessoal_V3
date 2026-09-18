import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));
vi.mock('@/hooks', () => ({
  useFeriasResumoColaborador: vi.fn(),
}));
vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import { useFeriasResumoColaborador } from '@/hooks';
import { FeriasResumoTab } from '../colaborador-detalhes/FeriasResumoTab';

describe('FeriasResumoTab', () => {
  it('shows spinner while loading', () => {
    vi.mocked(useFeriasResumoColaborador).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<FeriasResumoTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('shows no férias programada when there is nothing upcoming', () => {
    vi.mocked(useFeriasResumoColaborador).mockReturnValue({ data: [], isLoading: false } as any);
    render(<FeriasResumoTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhuma férias programada.')).toBeInTheDocument();
  });

  it('shows the next scheduled férias and the concluded history separately', () => {
    vi.mocked(useFeriasResumoColaborador).mockReturnValue({
      data: [
        { id: 'f1', data_inicio: '2099-01-10', data_fim: '2099-01-20', dias_gozo: 10, status: 'aprovada' },
        { id: 'f2', data_inicio: '2020-01-01', data_fim: '2020-01-15', dias_gozo: 15, status: 'concluida' },
      ],
      isLoading: false,
    } as any);
    render(<FeriasResumoTab colaboradorId="col-1" />);
    expect(screen.getByText('2099-01-10 até 2099-01-20 (10 dias) —')).toBeInTheDocument();
    expect(screen.getByText('2020-01-01 até 2020-01-15')).toBeInTheDocument();
  });
});
