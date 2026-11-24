import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

import { ExameKPIs } from '../exames/ExameKPIs';

const FUTURE_DATE = '2099-12-31';
const PAST_DATE = '2020-01-01';
const NEAR_FUTURE = new Date();
NEAR_FUTURE.setDate(NEAR_FUTURE.getDate() + 15);
const NEAR_DATE = NEAR_FUTURE.toISOString().split('T')[0];

const DATA = [
  { id: '1', resultado: 'apto', data_validade: FUTURE_DATE },
  { id: '2', resultado: 'apto', data_validade: FUTURE_DATE },
  { id: '3', resultado: 'inapto', data_validade: FUTURE_DATE },
  { id: '4', resultado: 'apto_restricao', data_validade: FUTURE_DATE },
  { id: '5', resultado: null, data_validade: FUTURE_DATE },
  { id: '6', resultado: 'apto', data_validade: PAST_DATE },
];

describe('ExameKPIs', () => {
  it('renders all 6 KPI labels', () => {
    render(<ExameKPIs data={DATA} />);
    expect(screen.getByText('Total de Exames')).toBeInTheDocument();
    expect(screen.getByText('Aptos')).toBeInTheDocument();
    expect(screen.getByText('Inaptos')).toBeInTheDocument();
    expect(screen.getByText('Com Restrição')).toBeInTheDocument();
    expect(screen.getByText('Pendentes')).toBeInTheDocument();
    expect(screen.getByText('Vencidos')).toBeInTheDocument();
  });

  it('counts total correctly', () => {
    render(<ExameKPIs data={DATA} />);
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('counts aptos correctly (3 apto)', () => {
    render(<ExameKPIs data={DATA} />);
    // 3 aptos, 1 inapto, 1 com restricao, 1 pendente, 1 vencido, 6 total
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
  });

  it('shows vencidos warning message', () => {
    render(<ExameKPIs data={DATA} />);
    expect(screen.getByText(/validade expirada/)).toBeInTheDocument();
  });

  it('shows vencendo message when near future', () => {
    const nearData = [{ id: '7', resultado: 'apto', data_validade: NEAR_DATE }];
    render(<ExameKPIs data={nearData} />);
    expect(screen.getByText(/vencendo nos próximos 30 dias/)).toBeInTheDocument();
  });

  it('renders empty (zeros) without crash', () => {
    render(<ExameKPIs data={[]} />);
    expect(screen.getByText('Total de Exames')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });
});
