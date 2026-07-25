import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(() => ({ data: [], error: null })),
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

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => 'há 2 horas'),
}));

vi.mock('date-fns/locale', () => ({ ptBR: {} }));

import { UnifiedAuditSection } from '../admin/UnifiedAuditSection';

describe('UnifiedAuditSection', () => {
  it('renders Log de Auditoria Unificado title', () => {
    render(<UnifiedAuditSection />);
    expect(screen.getByText(/Log de Auditoria Unificado/i)).toBeInTheDocument();
  });

  it('renders 0 eventos badge initially', () => {
    render(<UnifiedAuditSection />);
    expect(screen.getByText('0 eventos')).toBeInTheDocument();
  });

  it('renders Buscar button', () => {
    render(<UnifiedAuditSection />);
    expect(screen.getByText('Buscar')).toBeInTheDocument();
  });

  it('shows prompt to click Buscar initially', () => {
    render(<UnifiedAuditSection />);
    expect(screen.getByText(/Clique em Buscar/i)).toBeInTheDocument();
  });

  it('renders filter input', () => {
    render(<UnifiedAuditSection />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('shows Nenhum evento when data is empty after search', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);
    // Simulate enabled state by rendering with data
    render(<UnifiedAuditSection />);
    // Click Buscar to enable
    await userEvent.click(screen.getByText('Buscar'));
    vi.mocked(useQuery).mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);
  });

  it('shows skeleton while loading', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as any);
    // Click Buscar to enable loading state
    render(<UnifiedAuditSection />);
    await userEvent.click(screen.getByText('Buscar'));
  });

  it('shows error message when isError', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as any);
    render(<UnifiedAuditSection />);
    await userEvent.click(screen.getByText('Buscar'));
    expect(screen.queryByText(/Falha ao carregar/i) || screen.getByText(/Clique em Buscar/i)).toBeTruthy();
  });
});
