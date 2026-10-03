import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useAnotacoes: vi.fn(),
  useCriarAnotacao: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExcluirAnotacao: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
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

import { useAnotacoes } from '@/hooks/useColaboradorDetalhes';
import { AnotacoesTab } from '../colaborador-detalhes/AnotacoesTab';

const MOCK_ANOTACOES = [
  {
    id: 'a1',
    titulo: 'Feedback positivo',
    tipo: 'elogio',
    conteudo: 'Excelente desempenho no projeto',
    data: '2024-06-01',
  },
  { id: 'a2', titulo: 'Advertência verbal', tipo: 'advertencia', conteudo: null, data: '2024-07-15' },
];

describe('AnotacoesTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useAnotacoes).mockReturnValue({ data: undefined, isLoading: true } as never);
    render(<AnotacoesTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Anotações title', () => {
    vi.mocked(useAnotacoes).mockReturnValue({ data: [], isLoading: false } as never);
    render(<AnotacoesTab colaboradorId="col-1" />);
    expect(screen.getByText('Anotações')).toBeInTheDocument();
  });

  it('renders Nova Anotação button', () => {
    vi.mocked(useAnotacoes).mockReturnValue({ data: [], isLoading: false } as never);
    render(<AnotacoesTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Nova Anotação').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no data', () => {
    vi.mocked(useAnotacoes).mockReturnValue({ data: [], isLoading: false } as never);
    render(<AnotacoesTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhuma anotação.')).toBeInTheDocument();
  });

  it('renders anotacao titulo', () => {
    vi.mocked(useAnotacoes).mockReturnValue({ data: MOCK_ANOTACOES, isLoading: false } as never);
    render(<AnotacoesTab colaboradorId="col-1" />);
    expect(screen.getByText('Feedback positivo')).toBeInTheDocument();
    expect(screen.getByText('Advertência verbal')).toBeInTheDocument();
  });

  it('renders tipo badges', () => {
    vi.mocked(useAnotacoes).mockReturnValue({ data: MOCK_ANOTACOES, isLoading: false } as never);
    render(<AnotacoesTab colaboradorId="col-1" />);
    expect(screen.getAllByText('elogio').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('advertencia').length).toBeGreaterThanOrEqual(1);
  });

  it('renders conteudo when present', () => {
    vi.mocked(useAnotacoes).mockReturnValue({ data: MOCK_ANOTACOES, isLoading: false } as never);
    render(<AnotacoesTab colaboradorId="col-1" />);
    expect(screen.getByText('Excelente desempenho no projeto')).toBeInTheDocument();
  });
});
