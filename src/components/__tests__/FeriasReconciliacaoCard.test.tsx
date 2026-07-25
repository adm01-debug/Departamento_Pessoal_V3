import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/ferias/useReconciliacaoFolha', () => ({
  useReconciliacaoFolha: vi.fn(() => ({ data: [], isLoading: false })),
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

import { FeriasReconciliacaoCard } from '../ferias/FeriasReconciliacaoCard';

describe('FeriasReconciliacaoCard', () => {
  it('renders Reconciliação Férias ↔ Folha title', () => {
    render(<FeriasReconciliacaoCard />);
    expect(screen.getByText(/Reconciliação Férias/i)).toBeInTheDocument();
  });

  it('shows empty state when no divergences', () => {
    render(<FeriasReconciliacaoCard />);
    expect(screen.getByText(/Todas as férias aprovadas/i)).toBeInTheDocument();
  });

  it('shows skeleton when loading', async () => {
    const { useReconciliacaoFolha } = await import('@/hooks/ferias/useReconciliacaoFolha');
    vi.mocked(useReconciliacaoFolha).mockReturnValueOnce({ data: undefined, isLoading: true } as any);
    render(<FeriasReconciliacaoCard />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders row for each reconciliation item', async () => {
    const { useReconciliacaoFolha } = await import('@/hooks/ferias/useReconciliacaoFolha');
    vi.mocked(useReconciliacaoFolha).mockReturnValueOnce({
      data: [{
        ferias_id: 'f1',
        colaborador_nome: 'João Costa',
        colaborador_id: 'c1',
        situacao: 'divergente' as any,
        competencia: '2026-07-01',
        data_inicio: '2026-07-01',
        rubricas_geradas: 0,
        rubricas_esperadas: 2,
      }],
      isLoading: false,
    } as any);
    render(<FeriasReconciliacaoCard />);
    expect(screen.getByText('João Costa')).toBeInTheDocument();
  });

  it('shows Divergente badge for divergente situacao', async () => {
    const { useReconciliacaoFolha } = await import('@/hooks/ferias/useReconciliacaoFolha');
    vi.mocked(useReconciliacaoFolha).mockReturnValueOnce({
      data: [{
        ferias_id: 'f2',
        colaborador_nome: 'Ana',
        colaborador_id: 'c2',
        situacao: 'divergente' as any,
        competencia: '2026-07-01',
        data_inicio: '2026-07-01',
        rubricas_geradas: 0,
        rubricas_esperadas: 2,
      }],
      isLoading: false,
    } as any);
    render(<FeriasReconciliacaoCard />);
    expect(screen.getByText('Divergente')).toBeInTheDocument();
  });

  it('shows OK badge for ok situacao', async () => {
    const { useReconciliacaoFolha } = await import('@/hooks/ferias/useReconciliacaoFolha');
    vi.mocked(useReconciliacaoFolha).mockReturnValueOnce({
      data: [{
        ferias_id: 'f3',
        colaborador_nome: 'Pedro',
        colaborador_id: 'c3',
        situacao: 'ok' as any,
        competencia: '2026-07-01',
        data_inicio: '2026-07-01',
        rubricas_geradas: 2,
        rubricas_esperadas: 2,
      }],
      isLoading: false,
    } as any);
    render(<FeriasReconciliacaoCard />);
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('shows rubricas count text', async () => {
    const { useReconciliacaoFolha } = await import('@/hooks/ferias/useReconciliacaoFolha');
    vi.mocked(useReconciliacaoFolha).mockReturnValueOnce({
      data: [{
        ferias_id: 'f4',
        colaborador_nome: 'Maria',
        colaborador_id: 'c4',
        situacao: 'ok' as any,
        competencia: '2026-07-01',
        data_inicio: '2026-07-10',
        rubricas_geradas: 1,
        rubricas_esperadas: 3,
      }],
      isLoading: false,
    } as any);
    render(<FeriasReconciliacaoCard />);
    expect(screen.getByText(/rubricas/i)).toBeInTheDocument();
  });

  it('shows Pendente envio badge for pendente_envio', async () => {
    const { useReconciliacaoFolha } = await import('@/hooks/ferias/useReconciliacaoFolha');
    vi.mocked(useReconciliacaoFolha).mockReturnValueOnce({
      data: [{
        ferias_id: 'f5',
        colaborador_nome: 'Carlos',
        colaborador_id: 'c5',
        situacao: 'pendente_envio' as any,
        competencia: '2026-07-01',
        data_inicio: '2026-07-01',
        rubricas_geradas: 2,
        rubricas_esperadas: 2,
      }],
      isLoading: false,
    } as any);
    render(<FeriasReconciliacaoCard />);
    expect(screen.getByText(/Pendente envio/i)).toBeInTheDocument();
  });

  it('does not render empty state when data is present', async () => {
    const { useReconciliacaoFolha } = await import('@/hooks/ferias/useReconciliacaoFolha');
    vi.mocked(useReconciliacaoFolha).mockReturnValueOnce({
      data: [{
        ferias_id: 'f6',
        colaborador_nome: 'Luís',
        colaborador_id: 'c6',
        situacao: 'ok' as any,
        competencia: '2026-07-01',
        data_inicio: '2026-07-01',
        rubricas_geradas: 2,
        rubricas_esperadas: 2,
      }],
      isLoading: false,
    } as any);
    render(<FeriasReconciliacaoCard />);
    expect(screen.queryByText(/Todas as férias aprovadas/i)).not.toBeInTheDocument();
  });
});
