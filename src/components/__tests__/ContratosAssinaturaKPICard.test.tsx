import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useContratosAssinaturaKPI', () => ({
  useContratosAssinaturaKPI: vi.fn(() => ({
    kpi: {
      isLoading: false,
      data: {
        tokens_gerados: 10,
        tokens_assinados: 7,
        tokens_pendentes: 2,
        tokens_expirados: 1,
        taxa_conversao_pct: 70,
        tempo_medio_assinatura_h: 5.5,
      },
    },
    pendentes: { data: [] },
    revogar: { isPending: false, mutate: vi.fn() },
    reenviar: { isPending: false, mutate: vi.fn() },
    estender: { isPending: false, mutate: vi.fn() },
  })),
}));

vi.mock('./ContratoTokenTimelineDialog', () => ({
  ContratoTokenTimelineDialog: () => null,
}));

vi.mock('../contratos/ContratoTokenTimelineDialog', () => ({
  ContratoTokenTimelineDialog: () => null,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

import { ContratosAssinaturaKPICard } from '../contratos/ContratosAssinaturaKPICard';

describe('ContratosAssinaturaKPICard', () => {
  it('renders Conversão de assinaturas title', () => {
    render(<ContratosAssinaturaKPICard />);
    expect(screen.getAllByText('Conversão de assinaturas').length).toBeGreaterThanOrEqual(1);
  });

  it('shows skeleton when loading', async () => {
    const { useContratosAssinaturaKPI } = await import('@/hooks/useContratosAssinaturaKPI');
    vi.mocked(useContratosAssinaturaKPI).mockReturnValueOnce({
      kpi: { isLoading: true, data: null },
      pendentes: { data: [] },
      revogar: { isPending: false, mutate: vi.fn() },
      reenviar: { isPending: false, mutate: vi.fn() },
      estender: { isPending: false, mutate: vi.fn() },
    } as never);
    render(<ContratosAssinaturaKPICard />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders Gerados label', () => {
    render(<ContratosAssinaturaKPICard />);
    expect(screen.getByText('Gerados')).toBeInTheDocument();
  });

  it('renders Assinados label', () => {
    render(<ContratosAssinaturaKPICard />);
    expect(screen.getByText('Assinados')).toBeInTheDocument();
  });

  it('renders Pendentes label', () => {
    render(<ContratosAssinaturaKPICard />);
    expect(screen.getByText('Pendentes')).toBeInTheDocument();
  });

  it('renders Expirados label', () => {
    render(<ContratosAssinaturaKPICard />);
    expect(screen.getByText('Expirados')).toBeInTheDocument();
  });

  it('renders Conversão label', () => {
    render(<ContratosAssinaturaKPICard />);
    expect(screen.getByText('Conversão')).toBeInTheDocument();
  });

  it('renders conversion percentage', () => {
    render(<ContratosAssinaturaKPICard />);
    expect(screen.getByText('70%')).toBeInTheDocument();
  });
});
