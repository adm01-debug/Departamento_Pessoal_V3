import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/services/exportService', () => ({
  exportPontoCSV: vi.fn(),
}));

import { PontoAuditTimeline } from '../ponto/PontoAuditTimeline';

const MOCK_LOGS = [
  {
    id: 'alog-001',
    acao: 'UPDATE',
    tabela: 'registros_ponto',
    registro_id: 'rp-001',
    user_email: 'admin@empresa.com',
    created_at: '2026-07-01T08:00:00Z',
  },
];

describe('PontoAuditTimeline', () => {
  it('renders Trilha de Auditoria title', () => {
    render(<PontoAuditTimeline />);
    expect(screen.getByText(/Trilha de Auditoria/)).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<PontoAuditTimeline />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows empty state when no logs', () => {
    render(<PontoAuditTimeline />);
    expect(screen.getByText(/Nenhum registro de auditoria/i)).toBeInTheDocument();
  });

  it('renders Exportar CSV button', () => {
    render(<PontoAuditTimeline />);
    expect(screen.getByRole('button', { name: /Exportar CSV/i })).toBeInTheDocument();
  });

  it('renders log acao badge when logs provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<PontoAuditTimeline />);
    expect(screen.getByText('UPDATE')).toBeInTheDocument();
  });

  it('renders log tabela when logs provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<PontoAuditTimeline />);
    expect(screen.getByText('registros_ponto')).toBeInTheDocument();
  });

  it('renders user email in log', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_LOGS, isLoading: false } as any);
    render(<PontoAuditTimeline />);
    expect(screen.getByText('admin@empresa.com')).toBeInTheDocument();
  });

  it('renders without filterTabela prop', () => {
    render(<PontoAuditTimeline />);
    expect(screen.getByText(/Trilha de Auditoria/)).toBeInTheDocument();
  });
});
