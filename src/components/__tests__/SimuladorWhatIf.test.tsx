import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1', razao_social: 'Empresa Teste' } })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ data: null, error: null })),
    })),
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((e: any, d: string) => d) }));

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

import { SimuladorWhatIf } from '../folha/SimuladorWhatIf';

describe('SimuladorWhatIf', () => {
  it('renders Simulador What-if trigger button', () => {
    render(<SimuladorWhatIf />);
    expect(screen.getByText('Simulador What-if')).toBeInTheDocument();
  });

  it('renders dialog title', () => {
    render(<SimuladorWhatIf />);
    expect(screen.getByText(/Simulador.*What-if.*de Impacto Fiscal/i)).toBeInTheDocument();
  });

  it('renders Título da Simulação label', () => {
    render(<SimuladorWhatIf />);
    expect(screen.getByText('Título da Simulação')).toBeInTheDocument();
  });

  it('renders Salário Bruto Proposto label', () => {
    render(<SimuladorWhatIf />);
    expect(screen.getByText(/Salário Bruto Proposto/i)).toBeInTheDocument();
  });

  it('renders INSS Patronal label', () => {
    render(<SimuladorWhatIf />);
    expect(screen.getByText(/INSS Patronal/i)).toBeInTheDocument();
  });

  it('renders FGTS label', () => {
    render(<SimuladorWhatIf />);
    expect(screen.getAllByText(/FGTS/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Calcular Impacto Real button', () => {
    render(<SimuladorWhatIf />);
    expect(screen.getByText('Calcular Impacto Real')).toBeInTheDocument();
  });

  it('renders Benefícios Mensais label', () => {
    render(<SimuladorWhatIf />);
    expect(screen.getByText(/Benefícios Mensais/i)).toBeInTheDocument();
  });
});
