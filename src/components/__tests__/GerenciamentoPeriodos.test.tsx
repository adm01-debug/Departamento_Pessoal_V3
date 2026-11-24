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
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div>{children}</div>,
  AvatarFallback: ({ children }: any) => <div>{children}</div>,
  AvatarImage: () => null,
}));

import { useQuery } from '@tanstack/react-query';
import { GerenciamentoPeriodos } from '../ferias/GerenciamentoPeriodos';

const MOCK_PERIODOS = [
  { id: 'p1', numero_periodo: 1, data_inicio: '2023-01-01', data_fim: '2023-12-31', dias_direito: 30, status: 'concluido', colaborador_id: 'col-1' },
  { id: 'p2', numero_periodo: 2, data_inicio: '2024-01-01', data_fim: '2024-12-31', dias_direito: 30, status: 'aberto', colaborador_id: 'col-1' },
];

const MOCK_COLABORADORES = [
  { id: 'col-1', nome_completo: 'João Silva', cpf: '123.456.789-00' },
];

describe('GerenciamentoPeriodos', () => {
  it('renders search input for colaboradores', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<GerenciamentoPeriodos />);
    expect(screen.getByPlaceholderText(/Buscar por nome ou CPF/)).toBeInTheDocument();
  });

  it('renders Colaborador label', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<GerenciamentoPeriodos />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders Novo Período button when colaboradorId given', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: MOCK_COLABORADORES, isLoading: false } as any)
      .mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<GerenciamentoPeriodos colaboradorId="col-1" />);
    expect(screen.getByText('Novo Período')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching periodos', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: MOCK_COLABORADORES, isLoading: false } as any)
      .mockReturnValueOnce({ data: undefined, isLoading: true } as any);
    const { container } = render(<GerenciamentoPeriodos colaboradorId="col-1" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no periodos', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: MOCK_COLABORADORES, isLoading: false } as any)
      .mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<GerenciamentoPeriodos colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum período aquisitivo encontrado.')).toBeInTheDocument();
  });

  it('renders periodo numbers in table', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: MOCK_COLABORADORES, isLoading: false } as any)
      .mockReturnValueOnce({ data: MOCK_PERIODOS, isLoading: false } as any);
    render(<GerenciamentoPeriodos colaboradorId="col-1" />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('renders status badges in table', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce({ data: MOCK_COLABORADORES, isLoading: false } as any)
      .mockReturnValueOnce({ data: MOCK_PERIODOS, isLoading: false } as any);
    render(<GerenciamentoPeriodos colaboradorId="col-1" />);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
  });
});
