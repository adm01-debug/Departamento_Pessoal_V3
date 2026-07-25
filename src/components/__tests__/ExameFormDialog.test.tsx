import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    <div data-open={open} onClick={() => onOpenChange?.(!open)}>{children}</div>
  ),
  DialogTrigger: ({ children }: any) => <div data-testid="trigger">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)} data-testid="select">
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
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
      expect.objectContaining({ colaborador_id: 'col-1', tipo: 'admissional' })
    );
  });
});
