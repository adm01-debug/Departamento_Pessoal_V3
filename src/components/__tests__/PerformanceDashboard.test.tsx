import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

import { PerformanceDashboard } from '../avaliacao/PerformanceDashboard';

const STATS = {
  ciclos: 3,
  metas: 12,
  feedbacks: 45,
  pdis: 8,
  competencias: 6,
};

const FEEDBACKS = [
  { id: '1', nota_geral: 4.5 },
  { id: '2', nota_geral: 3.0 },
];

const METAS = [
  { id: 'm1', titulo: 'Aumentar Vendas', valor_objetivo: 100, valor_atual: 75 },
];

describe('PerformanceDashboard', () => {
  it('renders Ciclos KPI label', () => {
    render(<PerformanceDashboard stats={STATS} feedbacks={FEEDBACKS} metas={METAS} />);
    expect(screen.getByText('Ciclos')).toBeInTheDocument();
  });

  it('renders Metas KPI label', () => {
    render(<PerformanceDashboard stats={STATS} feedbacks={FEEDBACKS} metas={METAS} />);
    expect(screen.getByText('Metas')).toBeInTheDocument();
  });

  it('renders Feedbacks KPI label', () => {
    render(<PerformanceDashboard stats={STATS} feedbacks={FEEDBACKS} metas={METAS} />);
    expect(screen.getByText('Feedbacks')).toBeInTheDocument();
  });

  it('renders PDIs KPI label', () => {
    render(<PerformanceDashboard stats={STATS} feedbacks={FEEDBACKS} metas={METAS} />);
    expect(screen.getByText('PDIs')).toBeInTheDocument();
  });

  it('renders Competências KPI label', () => {
    render(<PerformanceDashboard stats={STATS} feedbacks={FEEDBACKS} metas={METAS} />);
    expect(screen.getByText('Competências')).toBeInTheDocument();
  });

  it('shows stats values', () => {
    render(<PerformanceDashboard stats={STATS} feedbacks={FEEDBACKS} metas={METAS} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('renders without crash when feedbacks and metas are empty', () => {
    render(<PerformanceDashboard stats={STATS} feedbacks={[]} metas={[]} />);
    expect(screen.getByText('Ciclos')).toBeInTheDocument();
  });
});
