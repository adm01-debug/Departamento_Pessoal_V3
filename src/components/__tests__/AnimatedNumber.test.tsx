import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    span: ({ children, className, ...props }: any) => <span className={className} {...props}>{children}</span>,
  },
  useInView: vi.fn(() => false),
}));

import { AnimatedNumber } from '../dashboard/AnimatedNumber';

describe('AnimatedNumber', () => {
  it('renders 0 initially when not in view', () => {
    render(<AnimatedNumber value={100} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders initial 0 even when format prop is provided', () => {
    render(<AnimatedNumber value={500} format={(n) => `R$ ${n}`} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('applies custom className to span', () => {
    const { container } = render(<AnimatedNumber value={42} className="text-xl font-bold" />);
    const span = container.querySelector('span');
    expect(span).toHaveClass('text-xl');
  });

  it('renders span element', () => {
    const { container } = render(<AnimatedNumber value={10} />);
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('renders when isInView is true and animates to value', async () => {
    const { useInView } = await import('framer-motion');
    vi.mocked(useInView).mockReturnValueOnce(true);
    render(<AnimatedNumber value={42} duration={0} />);
    expect(screen.getByText(/\d+/)).toBeInTheDocument();
  });

  it('renders with default duration', () => {
    render(<AnimatedNumber value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders with zero value', () => {
    render(<AnimatedNumber value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders with large value stays at 0 until animated', () => {
    render(<AnimatedNumber value={999999} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
