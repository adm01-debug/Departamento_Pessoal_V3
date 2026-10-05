import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useContatosEmergencia: vi.fn(),
  useCriarContatoEmergencia: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExcluirContatoEmergencia: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Visão de admin: testes verificam que os campos renderizam, não a política
// de máscara (coberta em usePiiMask.test.tsx).
vi.mock('@/hooks/usePiiMask', () => ({
  usePiiMask: () => ({
    canViewPii: true,
    phone: (v: string) => v,
    email: (v: string) => v,
    cpf: (v: string) => v,
    deep: (v: unknown) => v,
  }),
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

import { useContatosEmergencia } from '@/hooks/useColaboradorDetalhes';
import { EmergenciaTab } from '../colaborador-detalhes/EmergenciaTab';

const MOCK_CONTATOS = [
  {
    id: 'e1',
    nome: 'Maria Silva',
    parentesco: 'Cônjuge',
    telefone: '(31) 3333-4444',
    celular: '(31) 99999-8888',
    email: 'maria@example.com',
  },
];

describe('EmergenciaTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useContatosEmergencia).mockReturnValue({ data: undefined, isLoading: true } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Contatos de Emergência title', () => {
    vi.mocked(useContatosEmergencia).mockReturnValue({ data: [], isLoading: false } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);
    expect(screen.getByText('Contatos de Emergência')).toBeInTheDocument();
  });

  it('renders Adicionar button', () => {
    vi.mocked(useContatosEmergencia).mockReturnValue({ data: [], isLoading: false } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);
    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    vi.mocked(useContatosEmergencia).mockReturnValue({ data: [], isLoading: false } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum contato cadastrado.')).toBeInTheDocument();
  });

  it('renders contato nome', () => {
    vi.mocked(useContatosEmergencia).mockReturnValue({ data: MOCK_CONTATOS, isLoading: false } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
  });

  it('renders parentesco', () => {
    vi.mocked(useContatosEmergencia).mockReturnValue({ data: MOCK_CONTATOS, isLoading: false } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Cônjuge').length).toBeGreaterThanOrEqual(1);
  });

  it('renders telefone and celular', () => {
    vi.mocked(useContatosEmergencia).mockReturnValue({ data: MOCK_CONTATOS, isLoading: false } as never);
    render(<EmergenciaTab colaboradorId="col-1" />);
    expect(screen.getByText('(31) 3333-4444')).toBeInTheDocument();
    expect(screen.getByText('(31) 99999-8888')).toBeInTheDocument();
  });
});
