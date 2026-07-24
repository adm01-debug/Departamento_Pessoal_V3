import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Container } from '../layout/Container';

describe('Container', () => {
  it('renders children', () => {
    render(<Container>Content here</Container>);
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('renders as div by default', () => {
    const { container } = render(<Container>Test</Container>);
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('renders as custom element via as prop', () => {
    const { container } = render(<Container as="main">Test</Container>);
    expect(container.firstChild?.nodeName).toBe('MAIN');
  });

  it('applies max-width class for size xl (default)', () => {
    const { container } = render(<Container>Test</Container>);
    expect(container.firstChild).toHaveClass('max-w-screen-xl');
  });

  it('applies max-width class for size sm', () => {
    const { container } = render(<Container size="sm">Test</Container>);
    expect(container.firstChild).toHaveClass('max-w-screen-sm');
  });

  it('applies mx-auto when centered (default)', () => {
    const { container } = render(<Container>Test</Container>);
    expect(container.firstChild).toHaveClass('mx-auto');
  });

  it('does not apply mx-auto when centered=false', () => {
    const { container } = render(<Container centered={false}>Test</Container>);
    expect(container.firstChild).not.toHaveClass('mx-auto');
  });

  it('applies additional className', () => {
    const { container } = render(<Container className="custom-class">Test</Container>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
