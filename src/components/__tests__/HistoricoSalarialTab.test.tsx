import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useHistoricoSalarial: vi.fn(),
  useCriarRegistroSalarial: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => children,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { children?: ReactNode; placeholder?: string }) => <span>{placeholder || ''}</span>,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

import { useHistoricoSalarial } from '@/hooks/useColaboradorDetalhes';
import { HistoricoSalarialTab } from '../colaborador-detalhes/HistoricoSalarialTab';

const MOCK_HISTORICO = [
  {
    id: 's1',
    data_vigencia: '2024-03-01',
    salario_anterior: 4000,
    salario_novo: 5000,
    motivo: 'Promoção',
    descricao: 'Promoção para Sênior',
  },
];

describe('HistoricoSalarialTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useHistoricoSalarial).mockReturnValue({ data: undefined, isLoading: true } as never);
    render(<HistoricoSalarialTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Histórico Salarial title', () => {
    vi.mocked(useHistoricoSalarial).mockReturnValue({ data: [], isLoading: false } as never);
    render(<HistoricoSalarialTab colaboradorId="col-1" />);
    expect(screen.getByText('Histórico Salarial')).toBeInTheDocument();
  });

  it('renders Nova Alteração button', () => {
    vi.mocked(useHistoricoSalarial).mockReturnValue({ data: [], isLoading: false } as never);
    render(<HistoricoSalarialTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Nova Alteração').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no data', () => {
    vi.mocked(useHistoricoSalarial).mockReturnValue({ data: [], isLoading: false } as never);
    render(<HistoricoSalarialTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum registro encontrado.')).toBeInTheDocument();
  });

  it('renders data_vigencia', () => {
    vi.mocked(useHistoricoSalarial).mockReturnValue({ data: MOCK_HISTORICO, isLoading: false } as never);
    render(<HistoricoSalarialTab colaboradorId="col-1" />);
    expect(screen.getByText('2024-03-01')).toBeInTheDocument();
  });

  it('renders salario_novo formatted as BRL', () => {
    vi.mocked(useHistoricoSalarial).mockReturnValue({ data: MOCK_HISTORICO, isLoading: false } as never);
    render(<HistoricoSalarialTab colaboradorId="col-1" />);
    expect(screen.getByText(/5\.000/)).toBeInTheDocument();
  });

  it('renders motivo badge', () => {
    vi.mocked(useHistoricoSalarial).mockReturnValue({ data: MOCK_HISTORICO, isLoading: false } as never);
    render(<HistoricoSalarialTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Promoção').length).toBeGreaterThanOrEqual(1);
  });

  it('renders descricao in table', () => {
    vi.mocked(useHistoricoSalarial).mockReturnValue({ data: MOCK_HISTORICO, isLoading: false } as never);
    render(<HistoricoSalarialTab colaboradorId="col-1" />);
    expect(screen.getByText('Promoção para Sênior')).toBeInTheDocument();
  });
});
