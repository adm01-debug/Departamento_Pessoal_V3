import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  AreaChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Area: () => null,
  PieChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: ReactNode }) => <h3>{children}</h3>,
}));

import { TelemetryCharts } from '../admin/telemetry/TelemetryCharts';

const MOCK_ROW = {
  id: '1',
  operation: 'select',
  table_name: 'colaboradores',
  rpc_name: null,
  duration_ms: 4500,
  severity: 'slow',
  created_at: new Date().toISOString(),
};

describe('TelemetryCharts', () => {
  it('renders null when rows is empty', () => {
    const { container } = render(<TelemetryCharts rows={[]} timeFilter="24h" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Alertas ao Longo do Tempo title', () => {
    render(<TelemetryCharts rows={[MOCK_ROW]} timeFilter="24h" />);
    expect(screen.getByText('Alertas ao Longo do Tempo')).toBeInTheDocument();
  });

  it('renders Distribuição title', () => {
    render(<TelemetryCharts rows={[MOCK_ROW]} timeFilter="24h" />);
    expect(screen.getByText('Distribuição')).toBeInTheDocument();
  });

  it('renders Duração Média / Máxima title', () => {
    render(<TelemetryCharts rows={[MOCK_ROW]} timeFilter="24h" />);
    expect(screen.getByText('Duração Média / Máxima')).toBeInTheDocument();
  });

  it('renders Alertas por Tabela title', () => {
    render(<TelemetryCharts rows={[MOCK_ROW]} timeFilter="24h" />);
    expect(screen.getByText('Alertas por Tabela')).toBeInTheDocument();
  });

  it('renders all 4 chart titles when rows provided', () => {
    render(<TelemetryCharts rows={[MOCK_ROW]} timeFilter="1h" />);
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBe(4);
  });

  it('renders with 7d timeFilter', () => {
    render(<TelemetryCharts rows={[MOCK_ROW]} timeFilter="7d" />);
    expect(screen.getByText('Alertas ao Longo do Tempo')).toBeInTheDocument();
  });

  it('renders with rpc_name row', () => {
    const rpcRow = { ...MOCK_ROW, table_name: null, rpc_name: 'get_folha', severity: 'error' };
    render(<TelemetryCharts rows={[rpcRow]} timeFilter="6h" />);
    expect(screen.getByText('Alertas ao Longo do Tempo')).toBeInTheDocument();
  });
});
