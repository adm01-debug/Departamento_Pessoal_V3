import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/contexts', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'usr-001', email: 'joao@empresa.com' } })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('@/utils/dateLocal', () => ({
  formatDateLocalISO: vi.fn(() => '2026-06-24'),
}));

import { PontoStreakCard } from '../ponto/PontoStreakCard';

describe('PontoStreakCard', () => {
  it('renders Streak de Pontualidade title', () => {
    render(<PontoStreakCard />);
    expect(screen.getByText('Streak de Pontualidade')).toBeInTheDocument();
  });

  it('renders PRO PLAYER badge', () => {
    render(<PontoStreakCard />);
    expect(screen.getByText('PRO PLAYER')).toBeInTheDocument();
  });

  it('renders current streak value (0 when no data)', () => {
    render(<PontoStreakCard />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });

  it('renders dias consecutivos label', () => {
    render(<PontoStreakCard />);
    expect(screen.getByText('dias consecutivos')).toBeInTheDocument();
  });

  it('renders Melhor streak label', () => {
    render(<PontoStreakCard />);
    expect(screen.getByText('Melhor streak')).toBeInTheDocument();
  });

  it('renders Dias pontuais label', () => {
    render(<PontoStreakCard />);
    expect(screen.getByText('Dias pontuais')).toBeInTheDocument();
  });

  it('renders stats grid with Pontuais card', () => {
    render(<PontoStreakCard />);
    expect(screen.getByText('Pontuais')).toBeInTheDocument();
  });

  it('renders Bônus info text', () => {
    render(<PontoStreakCard />);
    expect(screen.getByText(/Bônus a cada 5 dias/i)).toBeInTheDocument();
  });
});
