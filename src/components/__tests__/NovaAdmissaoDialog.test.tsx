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
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type }: any) => (
    <button onClick={onClick} disabled={disabled} type={type}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
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
