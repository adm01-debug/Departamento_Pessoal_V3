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
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => null,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { GestaoPontoAnalytics } from '../ponto/GestaoPontoAnalytics';

const DEFAULT_REGISTROS = [
  { colaborador_id: 'col-1', data: '2026-07-01', entrada_1: '08:00', saida_1: '17:00', horas_trabalhadas: '08:00', atraso_minutos: 0, saida_intervalo: null, retorno_intervalo: null },
  { colaborador_id: 'col-1', data: '2026-07-02', entrada_1: '08:15', saida_1: '17:00', horas_trabalhadas: '07:45', atraso_minutos: 15, saida_intervalo: null, retorno_intervalo: null },
];

describe('GestaoPontoAnalytics', () => {
  it('renders Painel de Gestão Estratégica title', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText('Painel de Gestão Estratégica')).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText(/Monitoramento preditivo/i)).toBeInTheDocument();
  });

  it('renders IA Monitorando badge', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText('IA Monitorando')).toBeInTheDocument();
  });

  it('renders Custo Projetado label', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText(/Custo Projetado/i)).toBeInTheDocument();
  });

  it('renders Previsão IA badge', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText('Previsão IA')).toBeInTheDocument();
  });

  it('renders with non-empty registros', () => {
    render(<GestaoPontoAnalytics registros={DEFAULT_REGISTROS} />);
    expect(screen.getByText('Painel de Gestão Estratégica')).toBeInTheDocument();
  });

  it('renders MTP 671 reference in subtitle', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText(/MTP 671/i)).toBeInTheDocument();
  });

  it('renders 0h projection when no registros', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText('0h')).toBeInTheDocument();
  });
});
