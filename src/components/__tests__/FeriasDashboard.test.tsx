import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
}));

import { FeriasDashboard } from '../ferias/FeriasDashboard';

const FUTURE_DATE = '2027-01-15';
const FUTURE_END = '2027-02-14';

const MOCK_DATA = [
  {
    id: 'f1',
    data_inicio: FUTURE_DATE,
    data_fim: FUTURE_END,
    status: 'aprovada',
    dias_ferias: 30,
    colaborador: { nome_completo: 'João Silva' },
  },
  {
    id: 'f2',
    data_inicio: '2026-03-01',
    data_fim: '2026-03-30',
    status: 'concluida',
    dias_ferias: 30,
    colaborador: { nome_completo: 'Maria Souza' },
  },
];

describe('FeriasDashboard', () => {
  it('renders Férias nos Últimos 6 Meses chart title', () => {
    render(<FeriasDashboard data={[]} />);
    expect(screen.getByText('Férias nos Últimos 6 Meses')).toBeInTheDocument();
  });

  it('renders Distribuição por Status chart title', () => {
    render(<FeriasDashboard data={[]} />);
    expect(screen.getByText('Distribuição por Status')).toBeInTheDocument();
  });

  it('renders Próximos Colaboradores em Gozo section', () => {
    render(<FeriasDashboard data={[]} />);
    expect(screen.getByText('Próximos Colaboradores em Gozo')).toBeInTheDocument();
  });

  it('shows empty state when no future férias', () => {
    render(<FeriasDashboard data={[]} />);
    expect(screen.getByText('Nenhuma férias aprovada para o futuro próximo.')).toBeInTheDocument();
  });

  it('shows empty state when all férias are past', () => {
    render(<FeriasDashboard data={[MOCK_DATA[1]]} />);
    expect(screen.getByText('Nenhuma férias aprovada para o futuro próximo.')).toBeInTheDocument();
  });

  it('renders colaborador name for upcoming férias', () => {
    render(<FeriasDashboard data={MOCK_DATA} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders dias_ferias badge for upcoming férias', () => {
    render(<FeriasDashboard data={MOCK_DATA} />);
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('does not show past-only colaboradores in upcoming section', () => {
    render(<FeriasDashboard data={MOCK_DATA} />);
    expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument();
  });
});
