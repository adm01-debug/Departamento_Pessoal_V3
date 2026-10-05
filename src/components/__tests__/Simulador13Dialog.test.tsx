import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useCalcular13Salario', () => ({
  useCalcular13Salario: vi.fn(() => ({
    calcular: vi.fn(),
    loading: false,
    resultado: null,
  })),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  SelectValue: () => null,
}));

import { Simulador13Dialog } from '../folha/Simulador13Dialog';

describe('Simulador13Dialog', () => {
  it('renders 13º Salário trigger button', () => {
    render(<Simulador13Dialog />);
    expect(screen.getByText('13º Salário')).toBeInTheDocument();
  });

  it('renders Simulador 13º Salário dialog title', () => {
    render(<Simulador13Dialog />);
    expect(screen.getByText('Simulador 13º Salário')).toBeInTheDocument();
  });

  it('renders Salário Base label', () => {
    render(<Simulador13Dialog />);
    expect(screen.getByText('Salário Base (R$)')).toBeInTheDocument();
  });

  it('renders Data de Admissão label', () => {
    render(<Simulador13Dialog />);
    expect(screen.getByText('Data de Admissão')).toBeInTheDocument();
  });

  it('renders Parcela label', () => {
    render(<Simulador13Dialog />);
    expect(screen.getByText('Parcela')).toBeInTheDocument();
  });

  it('renders 1ª Parcela option', () => {
    render(<Simulador13Dialog />);
    expect(screen.getByText('1ª Parcela')).toBeInTheDocument();
  });

  it('renders 2ª Parcela option', () => {
    render(<Simulador13Dialog />);
    expect(screen.getByText('2ª Parcela')).toBeInTheDocument();
  });

  it('renders Dependentes IRRF label', () => {
    render(<Simulador13Dialog />);
    expect(screen.getByText('Dependentes IRRF')).toBeInTheDocument();
  });
});
