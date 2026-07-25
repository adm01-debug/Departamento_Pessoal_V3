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
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
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
