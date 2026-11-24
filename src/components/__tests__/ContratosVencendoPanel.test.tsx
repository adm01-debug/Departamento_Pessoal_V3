import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useContratosVencendo', () => ({
  useContratosVencendo: vi.fn(() => ({
    contratos: [],
    resumo: { vencido: 0, critico: 0, atencao: 0, ok: 5 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    gerarLink: vi.fn(),
  })),
}));

vi.mock('@/services/contratoTemplateService', () => ({
  TIPO_CONTRATO_LABELS: { clt: 'CLT', pj: 'PJ', estagio: 'Estágio' },
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton" />,
}));

import { ContratosVencendoPanel } from '../contratos/ContratosVencendoPanel';

describe('ContratosVencendoPanel', () => {
  it('renders Contratos vencendo title', () => {
    render(<ContratosVencendoPanel />);
    expect(screen.getByText('Contratos vencendo')).toBeInTheDocument();
  });

  it('renders CLT Art. 445 description', () => {
    render(<ContratosVencendoPanel />);
    expect(screen.getByText(/CLT Art. 445/i)).toBeInTheDocument();
  });

  it('renders Vencidos KPI label', () => {
    render(<ContratosVencendoPanel />);
    expect(screen.getByText('Vencidos')).toBeInTheDocument();
  });

  it('renders Críticos KPI label', () => {
    render(<ContratosVencendoPanel />);
    expect(screen.getByText(/Críticos/i)).toBeInTheDocument();
  });

  it('renders Atenção KPI label', () => {
    render(<ContratosVencendoPanel />);
    expect(screen.getByText(/Aten.*o/i)).toBeInTheDocument();
  });

  it('renders Em dia KPI label', () => {
    render(<ContratosVencendoPanel />);
    expect(screen.getByText('Em dia')).toBeInTheDocument();
  });

  it('renders Atualizar button', () => {
    render(<ContratosVencendoPanel />);
    expect(screen.getByRole('button', { name: /Atualizar/i })).toBeInTheDocument();
  });

  it('shows skeleton when loading', async () => {
    const { useContratosVencendo } = await import('@/hooks/useContratosVencendo');
    vi.mocked(useContratosVencendo).mockReturnValueOnce({
      contratos: [],
      resumo: { vencido: 0, critico: 0, atencao: 0, ok: 0 },
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
      gerarLink: vi.fn(),
    } as any);
    render(<ContratosVencendoPanel />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(1);
  });
});
