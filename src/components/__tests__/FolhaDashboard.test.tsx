import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  Area: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

import { FolhaDashboard } from '../folha/FolhaDashboard';

describe('FolhaDashboard', () => {
  it('renders Tendência de Custo chart title', () => {
    render(<FolhaDashboard competencia="2024-06" />);
    expect(screen.getByText(/Tendência de Custo/)).toBeInTheDocument();
  });

  it('renders Headcount vs Custo Médio chart title', () => {
    render(<FolhaDashboard competencia="2024-06" />);
    expect(screen.getByText(/Headcount vs Custo Médio/)).toBeInTheDocument();
  });

  it('renders Composição de Custos chart title', () => {
    render(<FolhaDashboard competencia="2024-06" />);
    expect(screen.getByText(/Composição de Custos/)).toBeInTheDocument();
  });

  it('renders without crashing for any competencia', () => {
    const { container } = render(<FolhaDashboard competencia="2025-01" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
