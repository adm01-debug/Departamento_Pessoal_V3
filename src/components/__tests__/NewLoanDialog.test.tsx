import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

vi.mock('@/utils/dateLocal', () => ({
  todayLocalISO: vi.fn(() => '2026-07-24'),
}));

import { NewLoanDialog } from '../descontos/NewLoanDialog';

const COLABORADORES = [
  { id: 'c1', nome_completo: 'Ana Lima' },
  { id: 'c2', nome_completo: 'Bruno Costa' },
];

describe('NewLoanDialog', () => {
  it('renders Novo Empréstimo trigger button', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Novo Empréstimo')).toBeInTheDocument();
  });

  it('renders Registrar Empréstimo Consignado title', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Registrar Empréstimo Consignado')).toBeInTheDocument();
  });

  it('renders Compliance L10.820 badge', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Compliance L10.820')).toBeInTheDocument();
  });

  it('renders Colaborador label', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders Instituição Financeira label', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Instituição Financeira')).toBeInTheDocument();
  });

  it('renders Valor Total label', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Valor Total (R$)')).toBeInTheDocument();
  });

  it('renders Número de Parcelas label', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Número de Parcelas')).toBeInTheDocument();
  });

  it('renders Cancelar and Confirmar Registro buttons', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Confirmar Registro')).toBeInTheDocument();
  });
});
