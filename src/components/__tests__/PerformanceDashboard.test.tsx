import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    span: ({ children, ...rest }: any) => <span {...rest}>{children}</span>,
    // `motion.create(Card)` é avaliado na CARGA de `ui/entrada-cards` (o mecanismo
    // de entrada reutilizado pelo módulo de Desempenho) — sem `create` o import
    // do módulo quebra antes de qualquer teste rodar.
    create: (Component: any) =>
      ({ children, custom, variants, initial, animate, ...rest }: any) =>
        <Component {...rest}>{children}</Component>,
  },
  AnimatePresence: ({ children }: any) => children,
  // Consumidos pelo card "Feedbacks por Status" (revelação do donut) e pelo
  // `AnimatedNumber` do percentual central.
  useInView: () => true,
  useReducedMotion: () => false,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

import { PerformanceDashboard } from '../avaliacao/PerformanceDashboard';

const FEEDBACKS = [
  { id: '1', nota_geral: 4.5, status: 'concluido' },
  { id: '2', nota_geral: 3.0, status: 'pendente' },
];

const METAS = [{ id: 'm1', titulo: 'Aumentar Vendas', valor_objetivo: 100, valor_atual: 75 }];

describe('PerformanceDashboard', () => {
  it('renders the three analytics panels', () => {
    render(<PerformanceDashboard feedbacks={FEEDBACKS} metas={METAS} />);
    expect(screen.getByText('Feedbacks por Status')).toBeInTheDocument();
    expect(screen.getByText('Distribuição das Notas')).toBeInTheDocument();
    expect(screen.getByText('Metas do Ciclo (Top 5)')).toBeInTheDocument();
  });

  it('no longer renders the five-indicator strip', () => {
    render(<PerformanceDashboard feedbacks={FEEDBACKS} metas={METAS} />);
    ['Ciclos', 'PDIs', 'Competências'].forEach((rotulo) => {
      expect(screen.queryByText(rotulo)).not.toBeInTheDocument();
    });
  });

  it('renders without crash when feedbacks and metas are empty', () => {
    render(<PerformanceDashboard feedbacks={[]} metas={[]} />);
    expect(screen.getByText('Feedbacks por Status')).toBeInTheDocument();
  });
});
