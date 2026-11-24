import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';

vi.mock('framer-motion', () => ({
  motion: {
    create: (Component: any) => ({ children, ...rest }: any) => <Component {...rest}>{children}</Component>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    polygon: (props: any) => <polygon {...props} />,
    polyline: (props: any) => <polyline {...props} />,
  },
  useInView: () => true,
}));

vi.mock('@/components/dashboard/AnimatedNumber', () => ({
  AnimatedNumber: ({ value, format }: any) => (
    <span>{format ? format(value) : String(value)}</span>
  ),
}));

vi.mock('@/components/dashboard/MiniSparkline', () => ({
  MiniSparkline: () => <svg data-testid="mini-sparkline" />,
}));

import { MetricCard } from '../dashboard/MetricCard';

describe('MetricCard', () => {
  it('renders title', () => {
    render(<MetricCard title="Colaboradores Ativos" value="42" icon={Users} gradient="from-primary to-primary-glow" />);
    expect(screen.getByText('Colaboradores Ativos')).toBeInTheDocument();
  });

  it('renders string value directly', () => {
    render(<MetricCard title="Teste" value="R$ 1.000" icon={Users} gradient="from-primary to-primary-glow" />);
    expect(screen.getByText('R$ 1.000')).toBeInTheDocument();
  });

  it('renders AnimatedNumber when rawValue is provided', () => {
    render(<MetricCard title="Folha Mensal" value="150000" rawValue={150000} icon={Users} gradient="from-success to-success/70" />);
    expect(screen.getByText('150000')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<MetricCard title="Teste" value="5" icon={Users} gradient="from-primary to-primary-glow" description="Este mês" />);
    expect(screen.getByText('Este mês')).toBeInTheDocument();
  });

  it('renders trend percentage', () => {
    render(<MetricCard title="Teste" value="5" icon={Users} gradient="from-primary to-primary-glow" trend={{ value: 12, label: 'vs mês anterior' }} />);
    expect(screen.getByText(/12%/)).toBeInTheDocument();
  });

  it('renders trend label', () => {
    render(<MetricCard title="Teste" value="5" icon={Users} gradient="from-primary to-primary-glow" trend={{ value: 12, label: 'vs mês anterior' }} />);
    expect(screen.getByText('vs mês anterior')).toBeInTheDocument();
  });

  it('renders sparkline when provided', () => {
    render(<MetricCard title="Teste" value="5" icon={Users} gradient="from-primary to-primary-glow" sparkline={[1, 2, 3, 4, 5]} />);
    expect(screen.getByTestId('mini-sparkline')).toBeInTheDocument();
  });

  it('renders without optional props without crashing', () => {
    const { container } = render(<MetricCard title="Minimal" value="0" icon={Users} gradient="from-primary to-primary-glow" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
