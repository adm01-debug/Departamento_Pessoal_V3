import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    circle: (props: any) => <circle {...props} />,
  },
  useInView: vi.fn(() => true),
}));

import { DonutChart } from '../dashboard/DonutChart';

const MOCK_SEGMENTS = [
  { label: 'CLT', value: 45, color: '#3b82f6' },
  { label: 'PJ', value: 20, color: '#22c55e' },
  { label: 'Estagiário', value: 10, color: '#f59e0b' },
];

describe('DonutChart', () => {
  it('returns null when total is 0', () => {
    const { container } = render(
      <DonutChart segments={[{ label: 'A', value: 0, color: '#fff' }]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders SVG with segments', () => {
    const { container } = render(<DonutChart segments={MOCK_SEGMENTS} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders total count in center text', () => {
    const { container } = render(<DonutChart segments={MOCK_SEGMENTS} />);
    expect(container.textContent).toContain('75');
  });

  it('renders "Total" label in center', () => {
    const { container } = render(<DonutChart segments={MOCK_SEGMENTS} />);
    expect(container.textContent).toContain('Total');
  });

  it('renders legend labels', () => {
    render(<DonutChart segments={MOCK_SEGMENTS} />);
    expect(screen.getByText('CLT')).toBeInTheDocument();
    expect(screen.getByText('PJ')).toBeInTheDocument();
    expect(screen.getByText('Estagiário')).toBeInTheDocument();
  });

  it('renders legend values', () => {
    const { container } = render(<DonutChart segments={MOCK_SEGMENTS} />);
    expect(container.textContent).toContain('45');
    expect(container.textContent).toContain('20');
    expect(container.textContent).toContain('10');
  });

  it('renders SVG with default size 140', () => {
    const { container } = render(<DonutChart segments={MOCK_SEGMENTS} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '140');
    expect(svg).toHaveAttribute('height', '140');
  });

  it('renders SVG with custom size', () => {
    const { container } = render(<DonutChart segments={MOCK_SEGMENTS} size={200} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '200');
    expect(svg).toHaveAttribute('height', '200');
  });
});
