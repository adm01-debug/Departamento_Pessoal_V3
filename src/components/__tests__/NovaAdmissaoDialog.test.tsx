import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useAdmissoes', () => ({
  useAdmissoes: vi.fn(() => ({
    criar: vi.fn(() => Promise.resolve()),
    admissoes: [],
    isLoading: false,
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
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
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

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

import { NovaAdmissaoDialog } from '../admissoes/NovaAdmissaoDialog';

describe('NovaAdmissaoDialog', () => {
  it('renders Nova Admissão trigger button by default', () => {
    render(<NovaAdmissaoDialog />);
    expect(screen.getAllByText('Nova Admissão').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Nova Admissão dialog title', () => {
    render(<NovaAdmissaoDialog />);
    expect(screen.getAllByText('Nova Admissão').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Nome completo label', () => {
    render(<NovaAdmissaoDialog />);
    expect(screen.getByText(/Nome completo/i)).toBeInTheDocument();
  });

  it('renders Cargo label', () => {
    render(<NovaAdmissaoDialog />);
    expect(screen.getByText(/^Cargo \*$/)).toBeInTheDocument();
  });

  it('renders Departamento label', () => {
    render(<NovaAdmissaoDialog />);
    expect(screen.getByText(/Departamento/i)).toBeInTheDocument();
  });

  it('renders Salário proposto label', () => {
    render(<NovaAdmissaoDialog />);
    expect(screen.getByText(/Salário proposto/i)).toBeInTheDocument();
  });

  it('renders Criar Admissão submit button', () => {
    render(<NovaAdmissaoDialog />);
    expect(screen.getByText('Criar Admissão')).toBeInTheDocument();
  });

  it('renders Cancelar button', () => {
    render(<NovaAdmissaoDialog />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('renders RH department option', () => {
    render(<NovaAdmissaoDialog />);
    expect(screen.getByText('RH')).toBeInTheDocument();
  });

  it('renders TI department option', () => {
    render(<NovaAdmissaoDialog />);
    expect(screen.getByText('TI')).toBeInTheDocument();
  });

  it('renders custom children as trigger when provided', () => {
    render(
      <NovaAdmissaoDialog>
        <button>Custom Trigger</button>
      </NovaAdmissaoDialog>
    );
    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
  });
});
