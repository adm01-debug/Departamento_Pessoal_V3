import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div> },
}));

import { LockoutMessage } from '../login/LockoutMessage';

describe('LockoutMessage', () => {
  it('renders blocked account message', () => {
    render(<LockoutMessage remainingSeconds={60} />);
    expect(screen.getByText(/Conta temporariamente bloqueada/i)).toBeInTheDocument();
  });

  it('shows remaining time in seconds when under a minute', () => {
    render(<LockoutMessage remainingSeconds={45} />);
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('shows minutes and seconds when >= 60 seconds', () => {
    render(<LockoutMessage remainingSeconds={90} />);
    expect(screen.getByText('1m 30s')).toBeInTheDocument();
  });

  it('shows 0s when remaining is zero', () => {
    render(<LockoutMessage remainingSeconds={0} />);
    expect(screen.getByText('0s')).toBeInTheDocument();
  });

  it('renders descriptive text about incorrect attempts', () => {
    render(<LockoutMessage remainingSeconds={30} />);
    expect(screen.getByText(/Muitas tentativas de login incorretas/i)).toBeInTheDocument();
  });

  it('renders without error for large values', () => {
    expect(() => render(<LockoutMessage remainingSeconds={600} />)).not.toThrow();
    expect(screen.getByText('10m 00s')).toBeInTheDocument();
  });
});
