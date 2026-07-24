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

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('date-fns', () => ({
  format: vi.fn(() => '01/07 10:00'),
}));

vi.mock('date-fns/locale', () => ({ ptBR: {} }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

import { PerformanceAuditTimeline } from '../avaliacao/PerformanceAuditTimeline';

const MOCK_LOGS = [
  {
    id: 'log-001',
    acao: 'UPDATE',
    tabela: 'metas_okrs',
    user_email: 'gestor@empresa.com',
    created_at: '2026-07-01T10:00:00',
    dados_novos: { progresso: 75 },
  },
  {
    id: 'log-002',
    acao: 'INSERT',
    tabela: 'ciclos_avaliacao',
    user_email: null,
    created_at: '2026-06-01T09:00:00',
    dados_novos: null,
  },
];

describe('PerformanceAuditTimeline', () => {
  it('renders Trilha de Desempenho title', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<PerformanceAuditTimeline />);
    expect(screen.getByText(/Trilha de Desempenho/i)).toBeInTheDocument();
  });

  it('renders empty state message when no logs', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [], isLoading: false } as any);
    render(<PerformanceAuditTimeline />);
    expect(screen.getByText(/Nenhum registro de auditoria/i)).toBeInTheDocument();
  });

  it('renders acao badge when logs exist', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<PerformanceAuditTimeline />);
    expect(screen.getByText(/UPDATE/i)).toBeInTheDocument();
  });

  it('renders tabela name in badge', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<PerformanceAuditTimeline />);
    expect(screen.getByText(/metas okrs/i)).toBeInTheDocument();
  });

  it('renders user email', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<PerformanceAuditTimeline />);
    expect(screen.getByText('gestor@empresa.com')).toBeInTheDocument();
  });

  it('renders Sistema when user_email is null', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<PerformanceAuditTimeline />);
    expect(screen.getByText('Sistema')).toBeInTheDocument();
  });

  it('renders dados_novos JSON when present', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    const { container } = render(<PerformanceAuditTimeline />);
    expect(container.textContent).toContain('progresso');
  });

  it('renders no empty state when logs exist', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<PerformanceAuditTimeline />);
    expect(screen.queryByText(/Nenhum registro/i)).toBeNull();
  });
});
