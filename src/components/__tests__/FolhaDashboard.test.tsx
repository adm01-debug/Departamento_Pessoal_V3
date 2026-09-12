import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockUseQuery } = vi.hoisted(() => ({ mockUseQuery: vi.fn() }));

vi.mock('@tanstack/react-query', () => ({ useQuery: mockUseQuery }));

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
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders Tendência de Proventos chart title', () => {
    render(<FolhaDashboard competencia="2024-06" />);
    expect(screen.getByText(/Tendência de Proventos/)).toBeInTheDocument();
  });

  it('renders Headcount vs Proventos Médios chart title', () => {
    render(<FolhaDashboard competencia="2024-06" />);
    expect(screen.getByText(/Headcount vs Proventos Médios/)).toBeInTheDocument();
  });

  it('renders Composição de Custos chart title', () => {
    render(<FolhaDashboard competencia="2024-06" />);
    expect(screen.getByText(/Composição de Custos/)).toBeInTheDocument();
  });

  it('renders without crashing for any competencia', () => {
    const { container } = render(<FolhaDashboard competencia="2025-01" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows an explicit empty state instead of static payroll amounts', () => {
    render(<FolhaDashboard competencia="09/2026" empresaId="empresa-1" />);
    expect(screen.getAllByText('Sem histórico para a empresa selecionada.')).toHaveLength(2);
    expect(screen.getByText('Sem valores calculados para esta competência.')).toBeInTheDocument();
  });
});
