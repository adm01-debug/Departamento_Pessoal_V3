import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

import { AfastamentoStats } from '../afastamentos/AfastamentoStats';

const BASE_STATS = {
  total: 20,
  ativos: 5,
  pendentes: 3,
  finalizados: 12,
  diasTotais: 150,
};

describe('AfastamentoStats', () => {
  it('renders total registros count', () => {
    render(<AfastamentoStats stats={BASE_STATS} />);
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('renders ativos count', () => {
    render(<AfastamentoStats stats={BASE_STATS} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders pendentes count', () => {
    render(<AfastamentoStats stats={BASE_STATS} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders finalizados count', () => {
    render(<AfastamentoStats stats={BASE_STATS} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders diasTotais count', () => {
    render(<AfastamentoStats stats={BASE_STATS} />);
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('renders KPI labels', () => {
    render(<AfastamentoStats stats={BASE_STATS} />);
    expect(screen.getByText('Total Registros')).toBeInTheDocument();
    expect(screen.getByText('Em Afastamento')).toBeInTheDocument();
    expect(screen.getByText('Concluídos')).toBeInTheDocument();
  });

  it('renders distribution section', () => {
    render(<AfastamentoStats stats={BASE_STATS} />);
    expect(screen.getByText(/Distribuição de Encaminhamentos/i)).toBeInTheDocument();
  });

  it('renders with zeros without crashing', () => {
    render(<AfastamentoStats stats={{ total: 0, ativos: 0, pendentes: 0, finalizados: 0, diasTotais: 0 }} />);
    expect(screen.getByText('Total Registros')).toBeInTheDocument();
  });
});
