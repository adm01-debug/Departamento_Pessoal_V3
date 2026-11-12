import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick }: { children?: ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button disabled={disabled} onClick={onClick}>
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

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
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

vi.mock('@/services/departamentoService', () => ({
  departamentoService: { contarColaboradoresVinculados: vi.fn() },
}));

import { toast } from 'sonner';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { departamentoService } from '@/services/departamentoService';
import { NovoDepartamentoDialog } from '../departamentos/NovoDepartamentoDialog';

describe('NovoDepartamentoDialog', () => {
  it('renders Novo Departamento title when no departamento prop', () => {
    render(<NovoDepartamentoDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Novo Departamento')).toBeInTheDocument();
  });

  it('renders Editar Departamento title when departamento provided', () => {
    render(
      <NovoDepartamentoDialog open={true} onOpenChange={vi.fn()} departamento={{ id: 'd1', nome: 'RH', ativo: true }} />
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
      <NovoDepartamentoDialog open={true} onOpenChange={vi.fn()} departamento={{ id: 'd1', nome: 'RH', ativo: true }} />
    );
    expect(screen.getByRole('button', { name: /Salvar/i })).toBeInTheDocument();
  });

  it('renders Departamento ativo switch label', () => {
    render(<NovoDepartamentoDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Departamento ativo')).toBeInTheDocument();
  });

  describe('inativação', () => {
    function setup(vinculados: number) {
      const atualizar = vi.fn().mockResolvedValue({});
      vi.mocked(useDepartamentos).mockReturnValue({
        criar: vi.fn(),
        atualizar,
        empresaId: 'emp-1',
      } as unknown as ReturnType<typeof useDepartamentos>);
      vi.mocked(departamentoService.contarColaboradoresVinculados).mockResolvedValue(vinculados);
      const onOpenChange = vi.fn();
      render(
        <NovoDepartamentoDialog
          open={true}
          onOpenChange={onOpenChange}
          departamento={{ id: 'd1', nome: 'RH', ativo: true }}
        />
      );
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));
      return { atualizar, onOpenChange };
    }

    it('bloqueia a inativação quando há colaboradores vinculados', async () => {
      const { atualizar, onOpenChange } = setup(3);
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('3 colaborador(es)')));
      expect(departamentoService.contarColaboradoresVinculados).toHaveBeenCalledWith('RH', 'emp-1');
      expect(atualizar).not.toHaveBeenCalled();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('inativa quando não há colaboradores vinculados', async () => {
      const { atualizar, onOpenChange } = setup(0);
      await waitFor(() => expect(atualizar).toHaveBeenCalledWith({ id: 'd1', data: { nome: 'RH', ativo: false } }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
