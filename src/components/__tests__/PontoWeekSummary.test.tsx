import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { PontoWeekSummary } from '../ponto/PontoWeekSummary';

const REGISTROS = [
  { id: 'r1', data: '2025-07-14', horas_trabalhadas: '08:00', horas_extras: '00:30', atraso_minutos: 0 },
  { id: 'r2', data: '2025-07-15', horas_trabalhadas: '07:45', horas_extras: null, atraso_minutos: 15 },
];

describe('PontoWeekSummary', () => {
  it('renders Últimos 7 dias title', () => {
    render(<PontoWeekSummary registrosSemana={REGISTROS} />);
    expect(screen.getByText('Últimos 7 dias')).toBeInTheDocument();
  });

  it('shows empty state when no registros', () => {
    render(<PontoWeekSummary registrosSemana={[]} />);
    expect(screen.getByText(/Sem registros recentes/)).toBeInTheDocument();
  });

  it('renders worked hours for each day', () => {
    render(<PontoWeekSummary registrosSemana={REGISTROS} />);
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('07:45')).toBeInTheDocument();
  });

  it('renders extra hours badge when > 00:00', () => {
    render(<PontoWeekSummary registrosSemana={REGISTROS} />);
    expect(screen.getByText('+00:30')).toBeInTheDocument();
  });

  it('renders atraso badge when > 0', () => {
    render(<PontoWeekSummary registrosSemana={REGISTROS} />);
    expect(screen.getByText('15m')).toBeInTheDocument();
  });

  it('limits display to 7 entries', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`, data: `2025-07-${String(i + 1).padStart(2, '0')}`,
      horas_trabalhadas: '08:00', horas_extras: null, atraso_minutos: 0,
    }));
    render(<PontoWeekSummary registrosSemana={many} />);
    const rows = screen.getAllByText('08:00');
    expect(rows.length).toBe(7);
  });
});
