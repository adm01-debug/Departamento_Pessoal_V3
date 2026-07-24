import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  ComposedChart: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

import { TurnoverChart } from '../desligamentos/TurnoverChart';

const NOW = new Date();
const THIS_MONTH_KEY = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}`;

const DESLIGAMENTOS = [
  { tipo: 'sem_justa_causa', data_desligamento: `${THIS_MONTH_KEY}-05` },
  { tipo: 'com_justa_causa', data_desligamento: `${THIS_MONTH_KEY}-10` },
  { tipo: 'pedido_demissao', data_desligamento: `${THIS_MONTH_KEY}-15` },
  { tipo: 'acordo_mutuo', data_desligamento: '2020-01-01' },
];

describe('TurnoverChart', () => {
  it('renders chart title', () => {
    render(<TurnoverChart desligamentos={DESLIGAMENTOS} />);
    expect(screen.getByText(/Turnover Mensal/)).toBeInTheDocument();
  });

  it('renders without crash when empty', () => {
    render(<TurnoverChart desligamentos={[]} />);
    expect(screen.getByText(/Turnover Mensal/)).toBeInTheDocument();
  });

  it('renders with all types of desligamentos', () => {
    render(<TurnoverChart desligamentos={DESLIGAMENTOS} />);
    expect(screen.getByText(/Turnover Mensal/)).toBeInTheDocument();
  });
});
