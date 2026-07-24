import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import { useQuery } from '@tanstack/react-query';
import { LogsIntegracoesTab } from '../settings/LogsIntegracoesTab';

const MOCK_LOGS = [
  {
    id: 'l1',
    integracao_nome: 'eSocial',
    integracao_id: null,
    acao: 'SYNC',
    action: null,
    status: 'sucesso',
    registros_processados: 42,
    records: null,
    created_at: '2024-06-15T10:30:00Z',
  },
  {
    id: 'l2',
    integracao_nome: 'FGTS Digital',
    integracao_id: null,
    acao: 'EXPORT',
    action: null,
    status: 'erro',
    registros_processados: 0,
    records: null,
    created_at: '2024-06-14T08:00:00Z',
  },
];

describe('LogsIntegracoesTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: true } as any);
    render(<LogsIntegracoesTab />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Logs de Integrações title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<LogsIntegracoesTab />);
    expect(screen.getByText('Logs de Integrações')).toBeInTheDocument();
  });

  it('renders subtitle with record count', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<LogsIntegracoesTab />);
    expect(screen.getByText('Últimos 100 registros de sincronização')).toBeInTheDocument();
  });

  it('shows empty state when no logs', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<LogsIntegracoesTab />);
    expect(screen.getByText('Nenhum log de integração encontrado')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_LOGS, isLoading: false } as any);
    render(<LogsIntegracoesTab />);
    expect(screen.getByText('Integração')).toBeInTheDocument();
    expect(screen.getByText('Ação')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders integracao_nome in table', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_LOGS, isLoading: false } as any);
    render(<LogsIntegracoesTab />);
    expect(screen.getByText('eSocial')).toBeInTheDocument();
    expect(screen.getByText('FGTS Digital')).toBeInTheDocument();
  });

  it('renders acao in table', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_LOGS, isLoading: false } as any);
    render(<LogsIntegracoesTab />);
    expect(screen.getByText('SYNC')).toBeInTheDocument();
    expect(screen.getByText('EXPORT')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_LOGS, isLoading: false } as any);
    render(<LogsIntegracoesTab />);
    expect(screen.getByText('sucesso')).toBeInTheDocument();
    expect(screen.getByText('erro')).toBeInTheDocument();
  });
});
