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
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/services/exportService', () => ({
  exportPontoCSV: vi.fn(),
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: ({ size }: any) => <div data-testid="spinner" data-size={size} />,
}));

import { useQuery } from '@tanstack/react-query';
import { GlobalAuditLogTab } from '../settings/GlobalAuditLogTab';

const MOCK_LOGS = [
  { id: 'l1', created_at: '2024-06-15T10:30:00Z', user_email: 'admin@empresa.com', acao: 'UPDATE', tabela: 'colaboradores', registro_id: 'col-1', dados_novos: { nome: 'João' } },
  { id: 'l2', created_at: '2024-06-14T08:00:00Z', user_email: null, acao: 'DELETE', tabela: 'ferias', registro_id: 'fer-2', dados_novos: null },
];

describe('GlobalAuditLogTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<GlobalAuditLogTab />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Central de Auditoria title', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<GlobalAuditLogTab />);
    expect(screen.getByText(/Central de Auditoria/)).toBeInTheDocument();
  });

  it('renders Exportar CSV button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<GlobalAuditLogTab />);
    expect(screen.getByText('Exportar CSV')).toBeInTheDocument();
  });

  it('renders search input', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<GlobalAuditLogTab />);
    expect(screen.getByPlaceholderText(/Buscar por usuário/)).toBeInTheDocument();
  });

  it('renders ação badges from log data', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_LOGS, isLoading: false } as any);
    render(<GlobalAuditLogTab />);
    expect(screen.getByText('UPDATE')).toBeInTheDocument();
    expect(screen.getByText('DELETE')).toBeInTheDocument();
  });

  it('renders user_email in table', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_LOGS, isLoading: false } as any);
    render(<GlobalAuditLogTab />);
    expect(screen.getByText('admin@empresa.com')).toBeInTheDocument();
  });

  it('renders Sistema fallback for null user_email', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_LOGS, isLoading: false } as any);
    render(<GlobalAuditLogTab />);
    expect(screen.getByText('Sistema')).toBeInTheDocument();
  });
});
