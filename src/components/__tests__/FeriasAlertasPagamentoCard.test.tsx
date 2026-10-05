import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/ferias/useAlertasPagamentoD2', () => ({
  useAlertasPagamentoD2: vi.fn(() => ({ data: [], isLoading: false })),
  useConfirmarPagamentoFerias: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

import { FeriasAlertasPagamentoCard } from '../ferias/FeriasAlertasPagamentoCard';

describe('FeriasAlertasPagamentoCard', () => {
  it('renders Pagamento de Férias title', () => {
    render(<FeriasAlertasPagamentoCard />);
    expect(screen.getAllByText(/Pagamento de Férias/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Art. 145 CLT reference in title', () => {
    render(<FeriasAlertasPagamentoCard />);
    expect(screen.getByText(/Art\. 145 CLT/)).toBeInTheDocument();
  });

  it('shows empty state when no alerts', () => {
    render(<FeriasAlertasPagamentoCard />);
    expect(screen.getByText(/Nenhuma pendência/i)).toBeInTheDocument();
  });

  it('shows skeleton while loading', async () => {
    const { useAlertasPagamentoD2 } = await import('@/hooks/ferias/useAlertasPagamentoD2');
    vi.mocked(useAlertasPagamentoD2).mockReturnValueOnce({ data: undefined, isLoading: true } as never);
    render(<FeriasAlertasPagamentoCard />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders Confirmar pagamento button when data exists', async () => {
    const { useAlertasPagamentoD2 } = await import('@/hooks/ferias/useAlertasPagamentoD2');
    vi.mocked(useAlertasPagamentoD2).mockReturnValueOnce({
      data: [{ id: 'a1', colaborador_id: 'c1', data_inicio: '2026-08-01', dias_ate_inicio: 3, severidade: 'critico' }],
      isLoading: false,
    } as never);
    render(<FeriasAlertasPagamentoCard />);
    expect(screen.getAllByText(/Confirmar pagamento/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Crítico — Art. 145 badge when critico severity', async () => {
    const { useAlertasPagamentoD2 } = await import('@/hooks/ferias/useAlertasPagamentoD2');
    vi.mocked(useAlertasPagamentoD2).mockReturnValueOnce({
      data: [{ id: 'a1', colaborador_id: 'c1', data_inicio: '2026-08-01', dias_ate_inicio: 1, severidade: 'critico' }],
      isLoading: false,
    } as never);
    render(<FeriasAlertasPagamentoCard />);
    expect(screen.getByText('Crítico — Art. 145')).toBeInTheDocument();
  });

  it('renders confirmar pagamento dialog title after click', async () => {
    const { useAlertasPagamentoD2 } = await import('@/hooks/ferias/useAlertasPagamentoD2');
    vi.mocked(useAlertasPagamentoD2).mockReturnValue({
      data: [{ id: 'a1', colaborador_id: 'c1', data_inicio: '2026-08-01', dias_ate_inicio: 2, severidade: 'atencao' }],
      isLoading: false,
    } as never);
    render(<FeriasAlertasPagamentoCard />);
    expect(screen.getByText('Confirmar pagamento de férias')).toBeInTheDocument();
  });

  it('renders Valor pago label in dialog', async () => {
    const { useAlertasPagamentoD2 } = await import('@/hooks/ferias/useAlertasPagamentoD2');
    vi.mocked(useAlertasPagamentoD2).mockReturnValue({
      data: [{ id: 'a1', colaborador_id: 'c1', data_inicio: '2026-08-01', dias_ate_inicio: 2, severidade: 'ok' }],
      isLoading: false,
    } as never);
    render(<FeriasAlertasPagamentoCard />);
    expect(screen.getByText(/Valor pago/i)).toBeInTheDocument();
  });
});
