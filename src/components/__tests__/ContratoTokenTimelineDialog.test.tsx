import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useContratoTokenTimeline', () => ({
  useContratoTokenTimeline: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

import { ContratoTokenTimelineDialog } from '../contratos/ContratoTokenTimelineDialog';

describe('ContratoTokenTimelineDialog', () => {
  it('renders Trilha de auditoria title', () => {
    render(<ContratoTokenTimelineDialog tokenId="tok-1" open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Trilha de auditoria do link/i)).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<ContratoTokenTimelineDialog tokenId="tok-1" open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Todos os eventos registrados/i)).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    render(<ContratoTokenTimelineDialog tokenId="tok-1" open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Nenhum evento registrado ainda.')).toBeInTheDocument();
  });

  it('shows skeletons when loading', async () => {
    const { useContratoTokenTimeline } = await import('@/hooks/useContratoTokenTimeline');
    vi.mocked(useContratoTokenTimeline).mockReturnValueOnce({ data: null, isLoading: true } as any);
    render(<ContratoTokenTimelineDialog tokenId="tok-1" open={true} onOpenChange={vi.fn()} />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(1);
  });

  it('renders event label when events provided', async () => {
    const { useContratoTokenTimeline } = await import('@/hooks/useContratoTokenTimeline');
    vi.mocked(useContratoTokenTimeline).mockReturnValueOnce({
      data: [{
        id: 'ev1',
        evento: 'gerado',
        ator_nome: 'Admin User',
        ip: '127.0.0.1',
        detalhes: { email: 'test@test.com' },
        created_at: '2026-07-24T10:00:00Z',
      }],
      isLoading: false,
    } as any);
    render(<ContratoTokenTimelineDialog tokenId="tok-1" open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Link gerado')).toBeInTheDocument();
  });

  it('renders actor name when event has ator_nome', async () => {
    const { useContratoTokenTimeline } = await import('@/hooks/useContratoTokenTimeline');
    vi.mocked(useContratoTokenTimeline).mockReturnValueOnce({
      data: [{
        id: 'ev1',
        evento: 'assinado',
        ator_nome: 'João Silva',
        ip: null,
        detalhes: {},
        created_at: '2026-07-24T10:00:00Z',
      }],
      isLoading: false,
    } as any);
    render(<ContratoTokenTimelineDialog tokenId="tok-1" open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders revogado event label', async () => {
    const { useContratoTokenTimeline } = await import('@/hooks/useContratoTokenTimeline');
    vi.mocked(useContratoTokenTimeline).mockReturnValueOnce({
      data: [{
        id: 'ev2',
        evento: 'revogado',
        ator_nome: null,
        ip: null,
        detalhes: { motivo: 'Erro no contrato' },
        created_at: '2026-07-24T10:00:00Z',
      }],
      isLoading: false,
    } as any);
    render(<ContratoTokenTimelineDialog tokenId="tok-1" open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Revogado')).toBeInTheDocument();
  });

  it('does not query when open is false', async () => {
    const { useContratoTokenTimeline } = await import('@/hooks/useContratoTokenTimeline');
    const mockHook = vi.mocked(useContratoTokenTimeline);
    render(<ContratoTokenTimelineDialog tokenId="tok-1" open={false} onOpenChange={vi.fn()} />);
    expect(mockHook).toHaveBeenCalledWith(null);
  });
});
