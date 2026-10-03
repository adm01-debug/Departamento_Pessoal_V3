import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <p {...props}>{children}</p>,
  },
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  CardContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    onKeyDown,
    placeholder,
    ...props
  }: {
    value?: string;
    onChange?: (e: unknown) => void;
    onKeyDown?: (e: unknown) => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
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
