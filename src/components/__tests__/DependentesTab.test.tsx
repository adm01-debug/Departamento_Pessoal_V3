import type { ReactNode } from 'react';
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
  SelectValue: ({ placeholder }: { children?: ReactNode; placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

import { useDependentes } from '@/hooks/useColaboradorDetalhes';
import { DependentesTab } from '../colaborador-detalhes/DependentesTab';
import { maskCpfDisplay } from '@/utils/piiMask';

const MOCK_DEPENDENTES = [
  {
    id: 'd1',
    nome: 'Ana Silva',
    parentesco: 'Filho(a)',
    cpf: '123.456.789-00',
    ir: true,
    salario_familia: false,
    incapacidade_fisica_mental: false,
  },
];

describe('DependentesTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: undefined, isLoading: true } as never);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Dependentes title', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: [], isLoading: false } as never);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getByText('Dependentes')).toBeInTheDocument();
  });

  it('renders Adicionar button', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: [], isLoading: false } as never);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: [], isLoading: false } as never);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum dependente cadastrado.')).toBeInTheDocument();
  });

  it('renders dependente nome and parentesco', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: MOCK_DEPENDENTES, isLoading: false } as never);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getAllByText('Filho(a)').length).toBeGreaterThanOrEqual(1);
  });

  it('renders cpf mascarado na tabela (LGPD)', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: MOCK_DEPENDENTES, isLoading: false } as never);
    render(<DependentesTab colaboradorId="col-1" />);
    // CPF de dependente é PII: só os 2 últimos dígitos podem aparecer.
    expect(screen.getByText(maskCpfDisplay('123.456.789-00'))).toBeInTheDocument();
    expect(screen.queryByText('123.456.789-00')).not.toBeInTheDocument();
  });

  it('renders IRRF badge when ir is true', () => {
    vi.mocked(useDependentes).mockReturnValue({ data: MOCK_DEPENDENTES, isLoading: false } as never);
    render(<DependentesTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Sim').length).toBeGreaterThanOrEqual(1);
  });
});
