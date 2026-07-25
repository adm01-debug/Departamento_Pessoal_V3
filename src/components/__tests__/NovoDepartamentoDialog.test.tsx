import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick }: any) => (
    <button disabled={disabled} onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
  ),
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/hooks/useDepartamentos', () => ({
  useDepartamentos: vi.fn(() => ({
    criar: vi.fn(),
    atualizar: vi.fn(),
  })),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { NovoDepartamentoDialog } from '../departamentos/NovoDepartamentoDialog';

describe('NovoDepartamentoDialog', () => {
  it('renders Novo Departamento title when no departamento prop', () => {
    render(<NovoDepartamentoDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Novo Departamento')).toBeInTheDocument();
  });

  it('renders Editar Departamento title when departamento provided', () => {
    render(
      <NovoDepartamentoDialog
        open={true}
        onOpenChange={vi.fn()}
        departamento={{ id: 'd1', nome: 'RH', descricao: '', ativo: true }}
      />
    );
    expect(screen.getByText('Editar Departamento')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<NovoDepartamentoDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Cadastre uma unidade/i)).toBeInTheDocument();
  });

  it('renders Nome label', () => {
    render(<NovoDepartamentoDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Nome *')).toBeInTheDocument();
  });

  it('renders Cancelar button', () => {
    render(<NovoDepartamentoDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });

  it('renders Criar Departamento button when new', () => {
    render(<NovoDepartamentoDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Criar Departamento/i })).toBeInTheDocument();
  });

  it('renders Salvar button when editing', () => {
    render(
      <NovoDepartamentoDialog
        open={true}
        onOpenChange={vi.fn()}
        departamento={{ id: 'd1', nome: 'RH', descricao: '', ativo: true }}
      />
    );
    expect(screen.getByRole('button', { name: /Salvar/i })).toBeInTheDocument();
  });

  it('renders Departamento ativo switch label', () => {
    render(<NovoDepartamentoDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Departamento ativo')).toBeInTheDocument();
  });
});
