import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: ({ size }: any) => <div data-testid="spinner" data-size={size} />,
}));

import { useQuery } from '@tanstack/react-query';
import { ConfiguracoesGeraisTab } from '../settings/ConfiguracoesGeraisTab';

const MOCK_CONFIGS = [
  { id: 'c1', chave: 'app.timezone', valor: 'America/Sao_Paulo', descricao: 'Timezone padrão', updated_at: '2024-06-01T00:00:00Z' },
  { id: 'c2', chave: 'folha.dia_fechamento', valor: '25', descricao: null, updated_at: null },
];

describe('ConfiguracoesGeraisTab', () => {
  it('shows loading state', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<ConfiguracoesGeraisTab />);
    expect(screen.getByText(/Carregando parâmetros/)).toBeInTheDocument();
  });

  it('renders Parâmetros de Backend title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<ConfiguracoesGeraisTab />);
    expect(screen.getByText('Parâmetros de Backend')).toBeInTheDocument();
  });

  it('renders Nova Config button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<ConfiguracoesGeraisTab />);
    expect(screen.getByText('Nova Config')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<ConfiguracoesGeraisTab />);
    expect(screen.getByText(/Nenhuma configuração cadastrada/)).toBeInTheDocument();
  });

  it('renders config chave', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_CONFIGS, isLoading: false } as any);
    render(<ConfiguracoesGeraisTab />);
    expect(screen.getByText('app.timezone')).toBeInTheDocument();
    expect(screen.getByText('folha.dia_fechamento')).toBeInTheDocument();
  });

  it('renders config valor as badge', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_CONFIGS, isLoading: false } as any);
    render(<ConfiguracoesGeraisTab />);
    expect(screen.getByText('America/Sao_Paulo')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('renders footer info about DB variables', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<ConfiguracoesGeraisTab />);
    expect(screen.getByText(/Variáveis de Ambiente de DB/)).toBeInTheDocument();
  });
});
