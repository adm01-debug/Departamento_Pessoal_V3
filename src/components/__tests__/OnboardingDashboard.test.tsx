import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  // Mock completo: o dashboard reaproveita `MetricCard`, `MiniSparkline` e
  // `DonutChart` (src/components/dashboard), que usam `motion.create`, `useInView`
  // e elementos SVG (`polygon`/`polyline`/`circle`) além do `motion.div`.
  // Os elementos só rendem `children` (sem repassar props de animação ao DOM).
  motion: {
    create:
      (Component: any) =>
      ({ children, ...rest }: any) => <Component {...rest}>{children}</Component>,
    div: ({ children }: any) => <div>{children}</div>,
    span: ({ children }: any) => <span>{children}</span>,
    li: ({ children }: any) => <li>{children}</li>,
    circle: () => <circle />,
    polygon: () => <polygon />,
    polyline: () => <polyline />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useInView: () => true,
  useReducedMotion: () => false,
}));

vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Cell: () => null,
  // O gráfico de tempo médio virou área (linha + degradê), então o container
  // testado é `AreaChart`/`Area` em vez de `LineChart`/`Line`.
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

// O `MiniSparkline` é mockado (com testid) só para provar que os KPI Cards de
// Admissões NÃO o renderizam: o prop `sparkline` continua existindo no
// `MetricCard` compartilhado, mas esta tela não o passa — então não há micro
// gráfico decorativo no canto direito do card.
vi.mock('@/components/dashboard/MiniSparkline', () => ({
  MiniSparkline: () => <svg data-testid="mini-sparkline" />,
}));

import { OnboardingDashboard } from '../admissoes/OnboardingDashboard';

const MOCK_ADMISSOES = [
  { id: '1', etapa: 'documentos' },
  { id: '2', etapa: 'documentos' },
  { id: '3', etapa: 'concluida' },
  { id: '4', etapa: 'cancelada' },
];

describe('OnboardingDashboard', () => {
  it('renders Total Iniciadas KPI', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('Total Iniciadas')).toBeInTheDocument();
  });

  it('renders Em Andamento KPI', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();
  });

  it('renders Finalizadas KPI', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('Finalizadas')).toBeInTheDocument();
  });

  it('renders Canceladas KPI', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('Canceladas')).toBeInTheDocument();
  });

  it('shows correct total count', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    const totalCard = screen.getByText('Total Iniciadas').closest('div');
    expect(totalCard?.textContent).toContain('4');
  });

  it('shows Tempo Médio de Admissão chart title', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText(/Tempo Médio de Admissão/i)).toBeInTheDocument();
  });

  it('renders charts', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('handles empty admissoes array', () => {
    render(<OnboardingDashboard admissoes={[]} />);
    expect(screen.getByText('Total Iniciadas')).toBeInTheDocument();
  });

  it('não renderiza micro gráfico nos KPI cards', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.queryAllByTestId('mini-sparkline')).toHaveLength(0);
  });

  // A linha de apoio (indicador + frase) é renderizada sem `truncate`: o texto
  // sai por inteiro no DOM, sem depender de largura disponível.
  it('mostra a frase de apoio completa de cada KPI', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('processos no período')).toBeInTheDocument();
    expect(screen.getByText('em pipeline agora')).toBeInTheDocument();
    expect(screen.getByText('concluídas no período')).toBeInTheDocument();
    expect(screen.getByText('processos encerrados no período')).toBeInTheDocument();
  });
});
