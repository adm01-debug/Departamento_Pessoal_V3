import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useFormacoes: vi.fn(),
  useCriarFormacao: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExcluirFormacao: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
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

import { useFormacoes } from '@/hooks/useColaboradorDetalhes';
import { FormacaoTab } from '../colaborador-detalhes/FormacaoTab';

const MOCK_FORMACOES = [
  {
    id: 'f1',
    tipo_escolaridade: 'Superior completo',
    curso: 'Ciências da Computação',
    instituicao: 'UFMG',
    ano_conclusao: 2020,
  },
];

describe('FormacaoTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useFormacoes).mockReturnValue({ data: undefined, isLoading: true } as never);
    render(<FormacaoTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Formação Acadêmica title', () => {
    vi.mocked(useFormacoes).mockReturnValue({ data: [], isLoading: false } as never);
    render(<FormacaoTab colaboradorId="col-1" />);
    expect(screen.getByText('Formação Acadêmica')).toBeInTheDocument();
  });

  it('renders Adicionar button', () => {
    vi.mocked(useFormacoes).mockReturnValue({ data: [], isLoading: false } as never);
    render(<FormacaoTab colaboradorId="col-1" />);
    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    vi.mocked(useFormacoes).mockReturnValue({ data: [], isLoading: false } as never);
    render(<FormacaoTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhuma formação cadastrada.')).toBeInTheDocument();
  });

  it('renders formação tipo_escolaridade', () => {
    vi.mocked(useFormacoes).mockReturnValue({ data: MOCK_FORMACOES, isLoading: false } as never);
    render(<FormacaoTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Superior completo').length).toBeGreaterThanOrEqual(1);
  });

  it('renders curso and instituicao', () => {
    vi.mocked(useFormacoes).mockReturnValue({ data: MOCK_FORMACOES, isLoading: false } as never);
    render(<FormacaoTab colaboradorId="col-1" />);
    expect(screen.getByText('Ciências da Computação')).toBeInTheDocument();
    expect(screen.getByText('UFMG')).toBeInTheDocument();
  });

  it('renders ano_conclusao', () => {
    vi.mocked(useFormacoes).mockReturnValue({ data: MOCK_FORMACOES, isLoading: false } as never);
    render(<FormacaoTab colaboradorId="col-1" />);
    expect(screen.getByText('2020')).toBeInTheDocument();
  });
});
