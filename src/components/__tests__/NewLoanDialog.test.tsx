import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { children?: ReactNode; placeholder?: string }) => <span>{placeholder}</span>,
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
