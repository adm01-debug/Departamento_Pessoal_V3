import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useDependentes: vi.fn(),
  useCriarDependente: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExcluirDependente: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
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

import { useDependentes } from '@/hooks/useColaboradorDetalhes';
import { DependentesTab } from '../colaborador-detalhes/DependentesTab';

const MOCK_DEPENDENTES = [
  { id: 'd1', nome: 'Ana Silva', parentesco: 'Filho(a)', cpf: '123.456.789-00', ir: true, salario_familia: false, incapacidade_fisica_mental: false },
];

describe('DependentesTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Dependentes title', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: [], isLoading: false } as any);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getByText('Dependentes')).toBeInTheDocument();
  });

  it('renders Adicionar button', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: [], isLoading: false } as any);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: [], isLoading: false } as any);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum dependente cadastrado.')).toBeInTheDocument();
  });

  it('renders dependente nome and parentesco', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: MOCK_DEPENDENTES, isLoading: false } as any);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getAllByText('Filho(a)').length).toBeGreaterThanOrEqual(1);
  });

  it('renders cpf in table', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: MOCK_DEPENDENTES, isLoading: false } as any);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getByText('123.456.789-00')).toBeInTheDocument();
  });

  it('renders IRRF badge when ir is true', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: MOCK_DEPENDENTES, isLoading: false } as any);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Sim').length).toBeGreaterThanOrEqual(1);
  });
});
