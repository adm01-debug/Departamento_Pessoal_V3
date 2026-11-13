import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

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

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-open={open} onClick={() => onOpenChange?.(!open)}>
      {children}
    </div>
  ),
  DialogTrigger: ({ children }: { children?: ReactNode }) => <div data-testid="trigger">{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children?: ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)} data-testid="select">
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { children?: ReactNode; placeholder?: string }) => (
    <option value="">{placeholder}</option>
  ),
  SelectItem: ({ value, children }: { value?: string; children?: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}));

vi.mock('lucide-react', () => ({ Plus: () => <span>+</span> }));

import { ExameFormDialog } from '../exames/ExameFormDialog';

const MOCK_COLABORADORES = [
  { id: 'col-1', nome_completo: 'Alice Silva' },
  { id: 'col-2', nome_completo: 'Bob Santos' },
];

describe('ExameFormDialog', () => {
  it('renders trigger button with "Novo Exame" text', () => {
    render(<ExameFormDialog colaboradores={MOCK_COLABORADORES} onSubmit={vi.fn()} />);
    expect(screen.getByText('Novo Exame')).toBeTruthy();
  });

  it('renders dialog content with title', () => {
    render(<ExameFormDialog colaboradores={MOCK_COLABORADORES} onSubmit={vi.fn()} />);
    expect(screen.getByText('Registrar Exame Ocupacional')).toBeTruthy();
  });

  it('renders all colaborador options in select', () => {
    render(<ExameFormDialog colaboradores={MOCK_COLABORADORES} onSubmit={vi.fn()} />);
    expect(screen.getByText('Alice Silva')).toBeTruthy();
    expect(screen.getByText('Bob Santos')).toBeTruthy();
  });

  it('shows tipo de exame options including Admissional', () => {
    render(<ExameFormDialog colaboradores={MOCK_COLABORADORES} onSubmit={vi.fn()} />);
    expect(screen.getByText('Admissional')).toBeTruthy();
    expect(screen.getByText('Demissional')).toBeTruthy();
  });

  it('shows resultado options including Apto', () => {
    render(<ExameFormDialog colaboradores={MOCK_COLABORADORES} onSubmit={vi.fn()} />);
    expect(screen.getByText('Apto')).toBeTruthy();
    expect(screen.getByText('Inapto')).toBeTruthy();
  });

  it('Registrar Exame button is disabled when colaborador_id is empty', () => {
    render(<ExameFormDialog colaboradores={MOCK_COLABORADORES} onSubmit={vi.fn()} />);
    const btn = screen.getByText('Registrar Exame').closest('button');
    expect(btn).toBeDisabled();
  });

  it('Registrar Exame button is disabled when isPending is true', () => {
    render(<ExameFormDialog colaboradores={MOCK_COLABORADORES} onSubmit={vi.fn()} isPending />);
    const btn = screen.getByText('Registrar Exame').closest('button');
    expect(btn).toBeDisabled();
  });

  it('calls onSubmit when form submitted with required fields', () => {
    const onSubmit = vi.fn();
    render(<ExameFormDialog colaboradores={MOCK_COLABORADORES} onSubmit={onSubmit} />);

    const selects = screen.getAllByTestId('select');
    // First select is colaborador, second is tipo, third is resultado
    fireEvent.change(selects[0], { target: { value: 'col-1' } });
    fireEvent.change(selects[1], { target: { value: 'admissional' } });

    const btn = screen.getByText('Registrar Exame').closest('button')!;
    fireEvent.click(btn);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ colaborador_id: 'col-1', tipo: 'admissional' }),
      expect.any(Function)
    );
  });

  it('modo edição: só fecha após o pai confirmar sucesso (erro mantém aberto)', () => {
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    const ui = (initial?: { colaborador_id: string; tipo: string }) => (
      <ExameFormDialog
        colaboradores={MOCK_COLABORADORES}
        onSubmit={onSubmit}
        open
        onOpenChange={onOpenChange}
        initial={initial}
      />
    );
    // A página monta o diálogo sem registro e depois passa o exame em edição.
    const { rerender } = render(ui());
    rerender(ui({ colaborador_id: 'col-1', tipo: 'periodico' }));

    const salvar = () => screen.getByText('Salvar Alterações').closest('button')!;
    fireEvent.click(salvar());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    // Sem confirmação de sucesso, os dados digitados permanecem (formulário não foi limpo).
    expect(salvar()).not.toBeDisabled();
    onOpenChange.mockClear(); // o mock de Dialog propaga o clique como toggle

    const onSaved = onSubmit.mock.calls[0][1] as () => void;
    act(() => onSaved());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(salvar()).toBeDisabled();
  });

  it('bloqueia salvar quando a validade é anterior à data do exame', () => {
    const ui = (initial?: Record<string, string>) => (
      <ExameFormDialog
        colaboradores={MOCK_COLABORADORES}
        onSubmit={vi.fn()}
        open
        onOpenChange={vi.fn()}
        initial={initial}
      />
    );
    const { rerender } = render(ui());
    rerender(ui({ colaborador_id: 'col-1', tipo: 'periodico', data_exame: '2026-05-10', data_validade: '2026-05-01' }));
    expect(screen.getByText('A validade não pode ser anterior à data do exame.')).toBeTruthy();
    expect(screen.getByText('Salvar Alterações').closest('button')).toBeDisabled();
  });
});
