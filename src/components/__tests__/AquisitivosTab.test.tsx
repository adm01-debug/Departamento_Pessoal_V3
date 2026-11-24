import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  usePeriodosAquisitivos: vi.fn(),
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import { usePeriodosAquisitivos } from '@/hooks/useColaboradorDetalhes';
import { AquisitivosTab } from '../colaborador-detalhes/AquisitivosTab';

const MOCK_PERIODOS = [
  { id: 'p1', inicio_aquisitivo: '2023-01-01', fim_aquisitivo: '2023-12-31', inicio_concessivo: '2024-01-01', fim_concessivo: '2024-12-31', saldo_atual: 30, faltas_periodo: 0, status: 'vigente' },
  { id: 'p2', inicio_aquisitivo: '2022-01-01', fim_aquisitivo: '2022-12-31', inicio_concessivo: '2023-01-01', fim_concessivo: '2023-12-31', saldo_atual: 10, faltas_periodo: 5, status: 'vencido' },
];

describe('AquisitivosTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(usePeriodosAquisitivos).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<AquisitivosTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Períodos Aquisitivos de Férias title', () => {
    vi.mocked(usePeriodosAquisitivos).mockReturnValue({ data: [], isLoading: false } as any);
    render(<AquisitivosTab colaboradorId="col-1" />);
    expect(screen.getByText('Períodos Aquisitivos de Férias')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    vi.mocked(usePeriodosAquisitivos).mockReturnValue({ data: [], isLoading: false } as any);
    render(<AquisitivosTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum período aquisitivo.')).toBeInTheDocument();
  });

  it('renders periodo aquisitivo dates', () => {
    vi.mocked(usePeriodosAquisitivos).mockReturnValue({ data: MOCK_PERIODOS, isLoading: false } as any);
    render(<AquisitivosTab colaboradorId="col-1" />);
    expect(screen.getAllByText(/2023-01-01 a 2023-12-31/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders saldo in dias', () => {
    vi.mocked(usePeriodosAquisitivos).mockReturnValue({ data: MOCK_PERIODOS, isLoading: false } as any);
    render(<AquisitivosTab colaboradorId="col-1" />);
    expect(screen.getByText('30 dias')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    vi.mocked(usePeriodosAquisitivos).mockReturnValue({ data: MOCK_PERIODOS, isLoading: false } as any);
    render(<AquisitivosTab colaboradorId="col-1" />);
    expect(screen.getByText('vigente')).toBeInTheDocument();
    expect(screen.getByText('vencido')).toBeInTheDocument();
  });

  it('renders faltas_periodo', () => {
    vi.mocked(usePeriodosAquisitivos).mockReturnValue({ data: MOCK_PERIODOS, isLoading: false } as any);
    render(<AquisitivosTab colaboradorId="col-1" />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
