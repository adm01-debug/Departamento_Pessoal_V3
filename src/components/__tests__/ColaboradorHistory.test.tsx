import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('date-fns', () => ({
  format: vi.fn(() => '01 de janeiro às 10:00'),
}));

vi.mock('date-fns/locale', () => ({ ptBR: {} }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

import { ColaboradorHistory } from '../colaboradores/ColaboradorHistory';

const MOCK_LOGS = [
  {
    id: 'log-001',
    acao: 'UPDATE',
    user_email: 'rh@empresa.com',
    created_at: '2026-07-01T10:00:00',
    campos_alterados: ['cargo'],
    dados_anteriores: { cargo: 'Analista' },
    dados_novos: { cargo: 'Gerente' },
  },
  {
    id: 'log-002',
    acao: 'INSERT',
    user_email: 'admin@empresa.com',
    created_at: '2026-06-01T08:00:00',
    campos_alterados: [],
    dados_anteriores: null,
    dados_novos: null,
  },
];

describe('ColaboradorHistory', () => {
  it('renders Spinner when loading', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: undefined, isLoading: true } as any);
    render(<ColaboradorHistory colaboradorId="col-001" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Histórico de Alterações title', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<ColaboradorHistory colaboradorId="col-001" />);
    expect(screen.getByText(/Histórico de Alterações/i)).toBeInTheDocument();
  });

  it('renders empty state message', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<ColaboradorHistory colaboradorId="col-001" />);
    expect(screen.getByText(/Nenhuma alteração registrada/i)).toBeInTheDocument();
  });

  it('renders Atualização badge for UPDATE log', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<ColaboradorHistory colaboradorId="col-001" />);
    expect(screen.getByText('Atualização')).toBeInTheDocument();
  });

  it('renders Admissão/Criação badge for INSERT log', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<ColaboradorHistory colaboradorId="col-001" />);
    expect(screen.getByText('Admissão/Criação')).toBeInTheDocument();
  });

  it('renders user email', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<ColaboradorHistory colaboradorId="col-001" />);
    expect(screen.getByText('rh@empresa.com')).toBeInTheDocument();
  });

  it('renders campo name for changed field', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    const { container } = render(<ColaboradorHistory colaboradorId="col-001" />);
    expect(container.textContent).toContain('cargo');
  });

  it('renders INSERT initial record message', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<ColaboradorHistory colaboradorId="col-001" />);
    expect(screen.getByText(/Registro inicial do colaborador/i)).toBeInTheDocument();
  });
});
