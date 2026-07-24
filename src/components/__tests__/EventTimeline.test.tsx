import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('@/hooks/useRealTimeSubscription', () => ({
  useRealTimeSubscription: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { useQuery } from '@tanstack/react-query';
import { EventTimeline } from '../dashboard/EventTimeline';

const MOCK_EVENTS = [
  { id: 'e1', title: 'Admissão: João', description: 'Novo colaborador', time: '09:00, 15 Jun', type: 'admissao' as const, raw_time: '2025-06-15T09:00:00Z' },
  { id: 'e2', title: 'Alerta de Ponto', description: 'Batida fora do horário', time: '10:00, 15 Jun', type: 'alerta' as const, raw_time: '2025-06-15T10:00:00Z' },
];

describe('EventTimeline', () => {
  it('shows empty state when no events', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, error: null } as any);
    render(<EventTimeline events={[]} />);
    expect(screen.getByText(/Nenhum evento recente/)).toBeInTheDocument();
  });

  it('renders event titles', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, error: null } as any);
    render(<EventTimeline events={MOCK_EVENTS} />);
    expect(screen.getByText('Admissão: João')).toBeInTheDocument();
    expect(screen.getByText('Alerta de Ponto')).toBeInTheDocument();
  });

  it('renders event descriptions', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, error: null } as any);
    render(<EventTimeline events={MOCK_EVENTS} />);
    expect(screen.getByText('Novo colaborador')).toBeInTheDocument();
  });

  it('renders filter badges', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, error: null } as any);
    render(<EventTimeline events={MOCK_EVENTS} />);
    expect(screen.getByText('Tudo')).toBeInTheDocument();
    expect(screen.getByText('admissao')).toBeInTheDocument();
  });

  it('filters events when badge clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, error: null } as any);
    render(<EventTimeline events={MOCK_EVENTS} />);
    await user.click(screen.getByText('alerta'));
    expect(screen.queryByText('Admissão: João')).not.toBeInTheDocument();
    expect(screen.getByText('Alerta de Ponto')).toBeInTheDocument();
  });

  it('renders sort button', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, error: null } as any);
    render(<EventTimeline events={MOCK_EVENTS} />);
    expect(screen.getByRole('button', { name: /Ordenar/ })).toBeInTheDocument();
  });

  it('uses dbEvents from useQuery when empresaId provided', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_EVENTS, isLoading: false, error: null } as any);
    render(<EventTimeline empresaId="emp-1" />);
    expect(screen.getByText('Admissão: João')).toBeInTheDocument();
  });
});
