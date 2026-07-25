import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/ferias/useReconciliacaoLogs', () => ({
  useReconciliacaoLogs: vi.fn(() => ({ data: [], isLoading: false })),
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

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <p>{children}</p>,
  AlertTitle: ({ children }: any) => <strong>{children}</strong>,
}));

import { FeriasReconciliacaoHistoricoCard } from '../ferias/FeriasReconciliacaoHistoricoCard';

describe('FeriasReconciliacaoHistoricoCard', () => {
  it('renders Reconciliação Automática — Histórico title', () => {
    render(<FeriasReconciliacaoHistoricoCard />);
    expect(screen.getByText(/Reconciliação Automática/i)).toBeInTheDocument();
  });

  it('shows empty state when no logs', () => {
    render(<FeriasReconciliacaoHistoricoCard />);
    expect(screen.getByText(/Aguardando a primeira execução/i)).toBeInTheDocument();
  });

  it('shows skeleton when loading', async () => {
    const { useReconciliacaoLogs } = await import('@/hooks/ferias/useReconciliacaoLogs');
    vi.mocked(useReconciliacaoLogs).mockReturnValueOnce({ data: undefined, isLoading: true } as any);
    render(<FeriasReconciliacaoHistoricoCard />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders log rows when data provided', async () => {
    const { useReconciliacaoLogs } = await import('@/hooks/ferias/useReconciliacaoLogs');
    vi.mocked(useReconciliacaoLogs).mockReturnValueOnce({
      data: [{
        id: 'log-1',
        executado_em: '2026-07-24T03:15:00Z',
        verificadas: 10,
        corrigidas: 0,
        restantes: 0,
        duracao_ms: 320,
      }],
      isLoading: false,
    } as any);
    render(<FeriasReconciliacaoHistoricoCard />);
    expect(screen.getByText('Consistente')).toBeInTheDocument();
  });

  it('renders pendente badge when restantes > 0', async () => {
    const { useReconciliacaoLogs } = await import('@/hooks/ferias/useReconciliacaoLogs');
    vi.mocked(useReconciliacaoLogs).mockReturnValueOnce({
      data: [{
        id: 'log-2',
        executado_em: '2026-07-24T03:15:00Z',
        verificadas: 5,
        corrigidas: 1,
        restantes: 3,
        duracao_ms: 450,
      }],
      isLoading: false,
    } as any);
    render(<FeriasReconciliacaoHistoricoCard />);
    expect(screen.getByText(/3 pendente/i)).toBeInTheDocument();
  });

  it('shows SLA critical alert when sla < 80', async () => {
    const { useReconciliacaoLogs } = await import('@/hooks/ferias/useReconciliacaoLogs');
    const logs = Array.from({ length: 5 }, (_, i) => ({
      id: `log-${i}`,
      executado_em: '2026-07-24T03:15:00Z',
      verificadas: 10,
      corrigidas: 1,
      restantes: 5,
      duracao_ms: 400,
    }));
    vi.mocked(useReconciliacaoLogs).mockReturnValueOnce({ data: logs, isLoading: false } as any);
    render(<FeriasReconciliacaoHistoricoCard />);
    expect(screen.getByText(/SLA de reconciliação/i)).toBeInTheDocument();
  });

  it('shows duration text in log row', async () => {
    const { useReconciliacaoLogs } = await import('@/hooks/ferias/useReconciliacaoLogs');
    vi.mocked(useReconciliacaoLogs).mockReturnValueOnce({
      data: [{
        id: 'log-3',
        executado_em: '2026-07-24T03:15:00Z',
        verificadas: 8,
        corrigidas: 2,
        restantes: 0,
        duracao_ms: 512,
      }],
      isLoading: false,
    } as any);
    render(<FeriasReconciliacaoHistoricoCard />);
    expect(screen.getAllByText(/512 ms/i).length).toBeGreaterThanOrEqual(1);
  });

  it('does not show SLA alert when all runs are consistent', async () => {
    const { useReconciliacaoLogs } = await import('@/hooks/ferias/useReconciliacaoLogs');
    const logs = Array.from({ length: 3 }, (_, i) => ({
      id: `log-ok-${i}`,
      executado_em: '2026-07-24T03:15:00Z',
      verificadas: 10,
      corrigidas: 0,
      restantes: 0,
      duracao_ms: 300,
    }));
    vi.mocked(useReconciliacaoLogs).mockReturnValueOnce({ data: logs, isLoading: false } as any);
    render(<FeriasReconciliacaoHistoricoCard />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('passes count parameter to useReconciliacaoLogs', async () => {
    const { useReconciliacaoLogs } = await import('@/hooks/ferias/useReconciliacaoLogs');
    const mockHook = vi.mocked(useReconciliacaoLogs);
    render(<FeriasReconciliacaoHistoricoCard />);
    expect(mockHook).toHaveBeenCalledWith(10);
  });
});
