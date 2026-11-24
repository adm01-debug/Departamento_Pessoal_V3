import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: ({ children }: any) => <div>{children}</div>,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

vi.mock('@/contexts', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-001', email: 'joao@empresa.com' } })),
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
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('@/utils/dateLocal', () => ({
  formatDateLocalISO: vi.fn(() => '2026-06-24'),
}));

import { PontoCharts } from '../ponto/PontoCharts';

const MOCK_REGISTROS = [
  {
    data: '2026-07-21',
    atraso_minutos: 0,
    horas_trabalhadas: 8,
    entrada_1: '08:00',
    entrada_esperada: '08:00',
  },
  {
    data: '2026-07-22',
    atraso_minutos: 10,
    horas_trabalhadas: 8,
    entrada_1: '08:10',
    entrada_esperada: '08:00',
  },
];

describe('PontoCharts', () => {
  it('returns null when no registros data', () => {
    const { container } = render(<PontoCharts />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Tendência Semanal card title when data provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_REGISTROS, isLoading: false } as any);
    render(<PontoCharts />);
    expect(screen.getByText('Tendência Semanal')).toBeInTheDocument();
  });

  it('renders Horários de Entrada card title when data provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_REGISTROS, isLoading: false } as any);
    render(<PontoCharts />);
    expect(screen.getByText('Horários de Entrada')).toBeInTheDocument();
  });

  it('renders both card headings when data provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_REGISTROS, isLoading: false } as any);
    render(<PontoCharts />);
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThanOrEqual(2);
  });

  it('renders grid layout when data provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_REGISTROS, isLoading: false } as any);
    const { container } = render(<PontoCharts />);
    expect(container.querySelector('.grid')).toBeInTheDocument();
  });

  it('renders card containers when data provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_REGISTROS, isLoading: false } as any);
    const { container } = render(<PontoCharts />);
    expect(container.querySelector('[class*="rounded-2xl"]')).toBeInTheDocument();
  });

  it('renders legend text when data provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_REGISTROS, isLoading: false } as any);
    const { container } = render(<PontoCharts />);
    expect(container.textContent).toContain('Pontual');
    expect(container.textContent).toContain('Atrasado');
  });

  it('renders wrapper element when data provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_REGISTROS, isLoading: false } as any);
    const { container } = render(<PontoCharts />);
    expect(container.firstChild).not.toBeNull();
  });
});
