import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

import { SignaturePad } from '../admissao/SignaturePad';

describe('SignaturePad', () => {
  it('renders canvas element', () => {
    const { container } = render(<SignaturePad onSave={vi.fn()} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('shows "Assine aqui" placeholder when empty', () => {
    render(<SignaturePad onSave={vi.fn()} />);
    expect(screen.getByText('Assine aqui')).toBeInTheDocument();
  });

  it('renders Limpar button', () => {
    render(<SignaturePad onSave={vi.fn()} />);
    expect(screen.getByText(/Limpar/i)).toBeInTheDocument();
  });

  it('shows legal certificate text', () => {
    render(<SignaturePad onSave={vi.fn()} />);
    expect(screen.getByText(/MP 2\.200-2/i)).toBeInTheDocument();
  });

  it('Limpar button is clickable without throwing', () => {
    const onClear = vi.fn();
    expect(() => {
      render(<SignaturePad onSave={vi.fn()} onClear={onClear} />);
      fireEvent.click(screen.getByText(/Limpar/i));
    }).not.toThrow();
  });

  it('does not show "Assinatura válida" when canvas is empty', () => {
    render(<SignaturePad onSave={vi.fn()} />);
    expect(screen.queryByText(/Assinatura válida/i)).not.toBeInTheDocument();
  });

  it('shows Lovable Cloud in legal text', () => {
    render(<SignaturePad onSave={vi.fn()} />);
    expect(screen.getByText(/Lovable Cloud/i)).toBeInTheDocument();
  });

  it('renders without onClear prop', () => {
    expect(() => render(<SignaturePad onSave={vi.fn()} />)).not.toThrow();
  });
});
