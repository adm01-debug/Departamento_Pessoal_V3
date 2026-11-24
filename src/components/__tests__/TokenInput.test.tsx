import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, onKeyDown, placeholder, ...props }: any) => (
    <input value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} {...props} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/assets/govbr-logo.svg', () => ({ default: 'govbr-logo.svg' }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
  },
}));

import { TokenInput } from '../contratacao/TokenInput';

const onValidToken = vi.fn();

describe('TokenInput', () => {
  it('renders Portal do Candidato title', () => {
    render(<TokenInput onValidToken={onValidToken} />);
    expect(screen.getByText('Portal do Candidato')).toBeInTheDocument();
  });

  it('renders Código de Acesso label', () => {
    const { container } = render(<TokenInput onValidToken={onValidToken} />);
    expect(container.textContent).toMatch(/Código de Acesso/i);
  });

  it('renders Acessar Portal button', () => {
    render(<TokenInput onValidToken={onValidToken} />);
    expect(screen.getByRole('button', { name: /Acessar Portal/i })).toBeInTheDocument();
  });

  it('Acessar Portal button is disabled when token is empty', () => {
    render(<TokenInput onValidToken={onValidToken} />);
    expect(screen.getByRole('button', { name: /Acessar Portal/i })).toBeDisabled();
  });

  it('renders process description text', () => {
    render(<TokenInput onValidToken={onValidToken} />);
    expect(screen.getByText(/código de acesso enviado pelo RH/i)).toBeInTheDocument();
  });

  it('button enables when token is typed', () => {
    render(<TokenInput onValidToken={onValidToken} />);
    const input = screen.getByPlaceholderText(/Insira seu código/i);
    fireEvent.change(input, { target: { value: 'ABC123' } });
    expect(screen.getByRole('button', { name: /Acessar Portal/i })).not.toBeDisabled();
  });

  it('renders Gov.br logo', () => {
    render(<TokenInput onValidToken={onValidToken} />);
    const img = screen.getByAltText('Gov.br');
    expect(img).toBeInTheDocument();
  });

  it('renders Powered by Lovable Cloud text', () => {
    render(<TokenInput onValidToken={onValidToken} />);
    expect(screen.getByText(/Powered by Lovable Cloud/i)).toBeInTheDocument();
  });
});
