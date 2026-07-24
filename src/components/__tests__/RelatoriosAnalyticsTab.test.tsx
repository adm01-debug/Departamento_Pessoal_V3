import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

import { RelatoriosAnalyticsTab } from '../relatorios/RelatoriosAnalyticsTab';

const ANALYTICS = {
  totalAtivos: 42,
  custoTotal: 150000,
  totalDeslig: 3,
  tendencia: [],
  porDepartamento: [],
  salarioDistribuicao: [],
};

describe('RelatoriosAnalyticsTab', () => {
  it('renders Colaboradores Ativos label', () => {
    render(<RelatoriosAnalyticsTab analytics={ANALYTICS} />);
    expect(screen.getByText('Colaboradores Ativos')).toBeInTheDocument();
  });

  it('renders Custo Folha Mensal label', () => {
    render(<RelatoriosAnalyticsTab analytics={ANALYTICS} />);
    expect(screen.getByText('Custo Folha Mensal')).toBeInTheDocument();
  });

  it('renders Desligamentos label', () => {
    render(<RelatoriosAnalyticsTab analytics={ANALYTICS} />);
    expect(screen.getByText('Desligamentos')).toBeInTheDocument();
  });

  it('renders Custo Médio label', () => {
    render(<RelatoriosAnalyticsTab analytics={ANALYTICS} />);
    expect(screen.getByText('Custo Médio')).toBeInTheDocument();
  });

  it('renders totalAtivos value', () => {
    render(<RelatoriosAnalyticsTab analytics={ANALYTICS} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders Admissoes vs Desligamentos chart title', () => {
    render(<RelatoriosAnalyticsTab analytics={ANALYTICS} />);
    expect(screen.getByText('Admissões vs Desligamentos')).toBeInTheDocument();
  });

  it('renders Headcount por Departamento chart title', () => {
    render(<RelatoriosAnalyticsTab analytics={ANALYTICS} />);
    expect(screen.getByText('Headcount por Departamento')).toBeInTheDocument();
  });

  it('renders with null analytics gracefully', () => {
    render(<RelatoriosAnalyticsTab analytics={null} />);
    expect(screen.getByText('Colaboradores Ativos')).toBeInTheDocument();
  });
});
