import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  usePeriodoExperiencia: vi.fn(),
  useSalvarPeriodoExperiencia: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder || ''}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

import { usePeriodoExperiencia } from '@/hooks/useColaboradorDetalhes';
import { ExperienciaTab } from '../colaborador-detalhes/ExperienciaTab';

const MOCK_DATA = {
  data_inicio: '2024-01-01',
  primeira_etapa_fim: '2024-02-15',
  segunda_etapa_fim: '2024-04-01',
  tipo: '45+45',
  status: 'Em andamento',
};

describe('ExperienciaTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(usePeriodoExperiencia).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<ExperienciaTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Período de Experiência title', () => {
    vi.mocked(usePeriodoExperiencia).mockReturnValue({ data: null, isLoading: false } as any);
    render(<ExperienciaTab colaboradorId="col-1" />);
    expect(screen.getByText('Período de Experiência')).toBeInTheDocument();
  });

  it('shows empty form message when no data', () => {
    vi.mocked(usePeriodoExperiencia).mockReturnValue({ data: null, isLoading: false } as any);
    render(<ExperienciaTab colaboradorId="col-1" />);
    expect(screen.getByText(/Nenhum período cadastrado/)).toBeInTheDocument();
  });

  it('renders data fields when data exists', () => {
    vi.mocked(usePeriodoExperiencia).mockReturnValue({ data: MOCK_DATA, isLoading: false } as any);
    render(<ExperienciaTab colaboradorId="col-1" />);
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
    expect(screen.getByText('45+45')).toBeInTheDocument();
  });

  it('renders status badge when data exists', () => {
    vi.mocked(usePeriodoExperiencia).mockReturnValue({ data: MOCK_DATA, isLoading: false } as any);
    render(<ExperienciaTab colaboradorId="col-1" />);
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });

  it('renders Editar button when data exists', () => {
    vi.mocked(usePeriodoExperiencia).mockReturnValue({ data: MOCK_DATA, isLoading: false } as any);
    render(<ExperienciaTab colaboradorId="col-1" />);
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });

  it('shows Cancelar when editing', async () => {
    const user = userEvent.setup();
    vi.mocked(usePeriodoExperiencia).mockReturnValue({ data: MOCK_DATA, isLoading: false } as any);
    render(<ExperienciaTab colaboradorId="col-1" />);
    await user.click(screen.getByText('Editar'));
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });
});
