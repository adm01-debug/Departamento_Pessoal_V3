import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useASOs: vi.fn(),
  useCriarASO: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

import { useASOs, useCriarASO } from '@/hooks/useColaboradorDetalhes';
import { ASOTab } from '../colaborador-detalhes/ASOTab';

const MOCK_ASOS = [
  { id: 'a1', tipo: 'Admissional', data_exame: '2024-01-10', data_validade: '2025-01-10', resultado: 'apto', medico_nome: 'Dr. Silva', medico_crm: '12345', clinica: 'Clínica Saúde' },
];

describe('ASOTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useASOs).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<ASOTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Atestados de Saúde Ocupacional title', () => {
    vi.mocked(useASOs).mockReturnValue({ data: [], isLoading: false } as any);
    render(<ASOTab colaboradorId="col-1" />);
    expect(screen.getByText('Atestados de Saúde Ocupacional')).toBeInTheDocument();
  });

  it('renders Novo ASO button', () => {
    vi.mocked(useASOs).mockReturnValue({ data: [], isLoading: false } as any);
    render(<ASOTab colaboradorId="col-1" />);
    expect(screen.getByText('Novo ASO')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    vi.mocked(useASOs).mockReturnValue({ data: [], isLoading: false } as any);
    render(<ASOTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum ASO registrado.')).toBeInTheDocument();
  });

  it('renders ASO tipo badge', () => {
    vi.mocked(useASOs).mockReturnValue({ data: MOCK_ASOS, isLoading: false } as any);
    render(<ASOTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Admissional').length).toBeGreaterThanOrEqual(1);
  });

  it('renders ASO data_exame', () => {
    vi.mocked(useASOs).mockReturnValue({ data: MOCK_ASOS, isLoading: false } as any);
    render(<ASOTab colaboradorId="col-1" />);
    expect(screen.getByText('2024-01-10')).toBeInTheDocument();
  });

  it('renders resultado badge', () => {
    vi.mocked(useASOs).mockReturnValue({ data: MOCK_ASOS, isLoading: false } as any);
    render(<ASOTab colaboradorId="col-1" />);
    expect(screen.getByText('apto')).toBeInTheDocument();
  });

  it('renders medico with CRM', () => {
    vi.mocked(useASOs).mockReturnValue({ data: MOCK_ASOS, isLoading: false } as any);
    render(<ASOTab colaboradorId="col-1" />);
    expect(screen.getByText(/Dr\. Silva/)).toBeInTheDocument();
    expect(screen.getByText(/CRM: 12345/)).toBeInTheDocument();
  });
});
