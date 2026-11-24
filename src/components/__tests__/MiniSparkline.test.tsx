import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    polygon: (props: any) => <polygon {...props} />,
    polyline: (props: any) => <polyline {...props} />,
  },
  useInView: vi.fn(() => true),
}));

import { MiniSparkline } from '../dashboard/MiniSparkline';

describe('MiniSparkline', () => {
  it('returns null when data has fewer than 2 points', () => {
    const { container } = render(<MiniSparkline data={[5]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when data is empty', () => {
    const { container } = render(<MiniSparkline data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders SVG when data has 2+ points', () => {
    const { container } = render(<MiniSparkline data={[1, 5, 3, 8]} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('SVG has default width=80 and height=28', () => {
    const { container } = render(<MiniSparkline data={[1, 2, 3]} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '80');
    expect(svg).toHaveAttribute('height', '28');
  });

  it('renders with custom width and height', () => {
    const { container } = render(<MiniSparkline data={[1, 2, 3]} width={120} height={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '40');
  });

  it('applies custom className to SVG', () => {
    const { container } = render(<MiniSparkline data={[1, 2, 3]} className="my-class" />);
    expect(container.querySelector('svg.my-class')).toBeInTheDocument();
  });

  it('renders linearGradient defs', () => {
    const { container } = render(<MiniSparkline data={[1, 5, 3]} />);
    expect(container.querySelector('defs')).toBeInTheDocument();
    expect(container.querySelector('linearGradient')).toBeInTheDocument();
  });

  it('renders polygon area fill when in view', () => {
    const { container } = render(<MiniSparkline data={[1, 3, 2, 5]} />);
    expect(container.querySelector('polygon')).toBeInTheDocument();
  });
});
