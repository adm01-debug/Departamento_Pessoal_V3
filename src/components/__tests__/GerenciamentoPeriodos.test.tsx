import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('@/services', () => ({
  feriasService: {
    listPeriodosAquisitivos: vi.fn(),
    criarPeriodoAquisitivo: vi.fn(),
    atualizarPeriodoAquisitivo: vi.fn(),
    excluirPeriodoAquisitivo: vi.fn(),
  },
  colaboradorService: { list: vi.fn() },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => children,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
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

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AvatarImage: () => null,
}));

import { useQuery } from '@tanstack/react-query';
import { GerenciamentoPeriodos } from '../ferias/GerenciamentoPeriodos';

const MOCK_PERIODOS = [
  {
    id: 'p1',
    numero_periodo: 1,
    data_inicio: '2023-01-01',
    data_fim: '2023-12-31',
    dias_direito: 30,
    status: 'concluido',
    colaborador_id: 'col-1',
  },
  {
    id: 'p2',
    numero_periodo: 2,
    data_inicio: '2024-01-01',
    data_fim: '2024-12-31',
    dias_direito: 30,
    status: 'aberto',
    colaborador_id: 'col-1',
  },
];

const MOCK_COLABORADORES = [{ id: 'col-1', nome_completo: 'João Silva', cpf: '123.456.789-00' }];

describe('GerenciamentoPeriodos', () => {
  it('renders search input for colaboradores', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<GerenciamentoPeriodos />);
    expect(screen.getByPlaceholderText(/Buscar por nome ou CPF/)).toBeInTheDocument();
  });

  it('renders Colaborador label', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as never);
    render(<GerenciamentoPeriodos />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders Novo Período button when colaboradorId given', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: MOCK_COLABORADORES, isLoading: false } as never)
      .mockReturnValueOnce({ data: [], isLoading: false } as never);
    render(<GerenciamentoPeriodos colaboradorId="col-1" />);
    expect(screen.getByText('Novo Período')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching periodos', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: MOCK_COLABORADORES, isLoading: false } as never)
      .mockReturnValueOnce({ data: undefined, isLoading: true } as never);
    const { container } = render(<GerenciamentoPeriodos colaboradorId="col-1" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no periodos', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: MOCK_COLABORADORES, isLoading: false } as never)
      .mockReturnValueOnce({ data: [], isLoading: false } as never);
    render(<GerenciamentoPeriodos colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum período aquisitivo encontrado.')).toBeInTheDocument();
  });

  it('renders periodo numbers in table', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: MOCK_COLABORADORES, isLoading: false } as never)
      .mockReturnValueOnce({ data: MOCK_PERIODOS, isLoading: false } as never);
    render(<GerenciamentoPeriodos colaboradorId="col-1" />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('renders status badges in table', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: MOCK_COLABORADORES, isLoading: false } as never)
      .mockReturnValueOnce({ data: MOCK_PERIODOS, isLoading: false } as never);
    render(<GerenciamentoPeriodos colaboradorId="col-1" />);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
  });
});
