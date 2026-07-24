import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => null,
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

import { BeneficiosDashboard } from '../beneficios/BeneficiosDashboard';

const BENEFICIOS = [
  { nome: 'Plano de Saúde', tipo: 'saude', valor: 400, beneficios_colaborador: [{ count: 5 }] },
  { nome: 'Vale Alimentação', tipo: 'alimentacao', valor: 600, beneficios_colaborador: [{ count: 10 }] },
];

describe('BeneficiosDashboard', () => {
  it('renders Investimento Total label', () => {
    render(<BeneficiosDashboard beneficios={BENEFICIOS} />);
    expect(screen.getByText('Investimento Total')).toBeInTheDocument();
  });

  it('renders Total de Adesões label', () => {
    render(<BeneficiosDashboard beneficios={BENEFICIOS} />);
    expect(screen.getByText('Total de Adesões')).toBeInTheDocument();
  });

  it('renders Benefícios Ativos label', () => {
    render(<BeneficiosDashboard beneficios={BENEFICIOS} />);
    expect(screen.getByText('Benefícios Ativos')).toBeInTheDocument();
  });

  it('renders Ticket Médio label', () => {
    render(<BeneficiosDashboard beneficios={BENEFICIOS} />);
    expect(screen.getByText('Ticket Médio')).toBeInTheDocument();
  });

  it('renders beneficios count', () => {
    render(<BeneficiosDashboard beneficios={BENEFICIOS} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders without crash when empty', () => {
    render(<BeneficiosDashboard beneficios={[]} />);
    expect(screen.getByText('Investimento Total')).toBeInTheDocument();
  });
});
