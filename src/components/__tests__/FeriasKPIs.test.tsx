import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { FeriasKPIs } from '../ferias/FeriasKPIs';

const STATS = {
  total: 25,
  pendentes: 3,
  aprovadas: 18,
  emGozo: 2,
  abonoPecuniario: 1,
  vencidas: 4,
};

describe('FeriasKPIs', () => {
  it('renders Total label', () => {
    render(<FeriasKPIs stats={STATS} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('renders Pendentes label', () => {
    render(<FeriasKPIs stats={STATS} />);
    expect(screen.getByText('Pendentes')).toBeInTheDocument();
  });

  it('renders Aprovadas label', () => {
    render(<FeriasKPIs stats={STATS} />);
    expect(screen.getByText('Aprovadas')).toBeInTheDocument();
  });

  it('renders Em Gozo label', () => {
    render(<FeriasKPIs stats={STATS} />);
    expect(screen.getByText('Em Gozo')).toBeInTheDocument();
  });

  it('renders Abono label', () => {
    render(<FeriasKPIs stats={STATS} />);
    expect(screen.getByText('Abono')).toBeInTheDocument();
  });

  it('renders Vencidas label', () => {
    render(<FeriasKPIs stats={STATS} />);
    expect(screen.getByText('Vencidas')).toBeInTheDocument();
  });

  it('renders stat values', () => {
    render(<FeriasKPIs stats={STATS} />);
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders 6 KPI cards', () => {
    const { container } = render(<FeriasKPIs stats={STATS} />);
    const cards = container.querySelectorAll('[class*="rounded-2xl"]');
    expect(cards.length).toBeGreaterThanOrEqual(6);
  });
});
