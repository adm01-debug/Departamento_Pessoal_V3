import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { BarChartWidget } from '../dashboard/BarChartWidget';

const MOCK_DATA = [
  { label: 'Jan', value: 30 },
  { label: 'Fev', value: 50 },
  { label: 'Mar', value: 20 },
];

describe('BarChartWidget', () => {
  it('renders bar labels', () => {
    render(<BarChartWidget data={MOCK_DATA} />);
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Fev')).toBeInTheDocument();
    expect(screen.getByText('Mar')).toBeInTheDocument();
  });

  it('renders bar values when showValues=true (default)', () => {
    render(<BarChartWidget data={MOCK_DATA} />);
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('does not render values when showValues=false', () => {
    render(<BarChartWidget data={MOCK_DATA} showValues={false} />);
    expect(screen.queryByText('30')).toBeNull();
    expect(screen.queryByText('50')).toBeNull();
  });

  it('renders correct number of bar columns', () => {
    const { container } = render(<BarChartWidget data={MOCK_DATA} />);
    const cols = container.querySelectorAll('.flex-1');
    expect(cols.length).toBe(3);
  });

  it('applies custom className to wrapper', () => {
    const { container } = render(<BarChartWidget data={MOCK_DATA} className="my-chart" />);
    expect(container.firstChild).toHaveClass('my-chart');
  });

  it('renders with single data point', () => {
    render(<BarChartWidget data={[{ label: 'Único', value: 10 }]} />);
    expect(screen.getByText('Único')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('applies custom height via style', () => {
    const { container } = render(<BarChartWidget data={MOCK_DATA} height={200} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe('200px');
  });

  it('renders 0 values correctly', () => {
    render(<BarChartWidget data={[{ label: 'Vazio', value: 0 }]} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Vazio')).toBeInTheDocument();
  });
});
