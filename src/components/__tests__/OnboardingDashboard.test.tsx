import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
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
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
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
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('handles empty admissoes array', () => {
    render(<OnboardingDashboard admissoes={[]} />);
    expect(screen.getByText('Total Iniciadas')).toBeInTheDocument();
  });
});
