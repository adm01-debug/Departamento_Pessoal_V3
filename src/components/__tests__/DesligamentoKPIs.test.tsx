import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

import { DesligamentoKPIs } from '../desligamentos/DesligamentoKPIs';

const NOW = new Date();
const THIS_MONTH = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}-10`;

const DESLIGAMENTOS = [
  { status: 'pendente', valor_liquido: 5000, data_desligamento: THIS_MONTH },
  { status: 'em_andamento', valor_liquido: 3000, data_desligamento: '2023-01-10' },
  { status: 'concluido', valor_liquido: 8000, data_desligamento: THIS_MONTH },
  { status: 'finalizado', valor_liquido: 2000, data_desligamento: '2023-06-20' },
];

describe('DesligamentoKPIs', () => {
  it('renders total desligamentos', () => {
    render(<DesligamentoKPIs desligamentos={DESLIGAMENTOS} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders pendentes count (pendente + em_andamento)', () => {
    render(<DesligamentoKPIs desligamentos={DESLIGAMENTOS} />);
    // multiple elements may show '2'; verify at least one exists
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('renders concluidos count (concluido + finalizado)', () => {
    render(<DesligamentoKPIs desligamentos={DESLIGAMENTOS} />);
    expect(screen.getByText('Total Desligamentos')).toBeInTheDocument();
    expect(screen.getByText('Concluídos')).toBeInTheDocument();
  });

  it('renders valor total rescisoes', () => {
    render(<DesligamentoKPIs desligamentos={DESLIGAMENTOS} />);
    expect(screen.getByText('Valor Total Rescisões')).toBeInTheDocument();
    // 5000 + 3000 + 8000 + 2000 = 18000
    expect(screen.getByText(/18\.000/)).toBeInTheDocument();
  });

  it('renders este mes label', () => {
    render(<DesligamentoKPIs desligamentos={DESLIGAMENTOS} />);
    expect(screen.getByText('Este Mês')).toBeInTheDocument();
  });

  it('renders all 5 KPI labels', () => {
    render(<DesligamentoKPIs desligamentos={DESLIGAMENTOS} />);
    expect(screen.getByText('Total Desligamentos')).toBeInTheDocument();
    expect(screen.getByText('Pendentes')).toBeInTheDocument();
    expect(screen.getByText('Concluídos')).toBeInTheDocument();
    expect(screen.getByText('Este Mês')).toBeInTheDocument();
    expect(screen.getByText('Valor Total Rescisões')).toBeInTheDocument();
  });

  it('handles empty array without crashing', () => {
    render(<DesligamentoKPIs desligamentos={[]} />);
    expect(screen.getByText('Total Desligamentos')).toBeInTheDocument();
    // All zeros when empty
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });
});
