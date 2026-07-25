import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockMutateAsync = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useColaboradores', () => ({
  useColaboradores: () => ({
    colaboradores: [
      { id: 'col-1', nome_completo: 'Alice Silva' },
      { id: 'col-2', nome_completo: 'Bob Santos' },
    ],
  }),
}));

vi.mock('@/hooks/usePeriodosAquisitivos', () => ({
  usePeriodosAquisitivos: () => ({
    periodos: [
      { id: 'pa-1', data_inicio: '2025-01-01', data_fim: '2025-12-31', status: 'em_andamento' },
    ],
  }),
}));

vi.mock('@/hooks/ferias/useProgramacaoFerias', () => ({
  useProgramacaoMutations: () => ({
    criar: { mutateAsync: mockMutateAsync, isPending: false },
  }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>{children}</button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div data-testid="footer">{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input data-testid="input" {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea data-testid="textarea" {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)} data-testid="select">
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder ?? ''}</option>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

import { NovaProgramacaoDialog } from '../ferias/programacao/NovaProgramacaoDialog';

describe('NovaProgramacaoDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <NovaProgramacaoDialog open={false} onOpenChange={vi.fn()} ano={2026} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog title when open', () => {
    render(<NovaProgramacaoDialog open onOpenChange={vi.fn()} ano={2026} />);
    expect(screen.getByText('Nova programação de férias')).toBeTruthy();
  });

  it('renders colaborador options', () => {
    render(<NovaProgramacaoDialog open onOpenChange={vi.fn()} ano={2026} />);
    expect(screen.getByText('Alice Silva')).toBeTruthy();
    expect(screen.getByText('Bob Santos')).toBeTruthy();
  });

  it('shows all 12 month options', () => {
    render(<NovaProgramacaoDialog open onOpenChange={vi.fn()} ano={2026} />);
    expect(screen.getByText('Jan/2026')).toBeTruthy();
    expect(screen.getByText('Dez/2026')).toBeTruthy();
  });

  it('shows periodo aquisitivo when colaborador selected', () => {
    render(<NovaProgramacaoDialog open onOpenChange={vi.fn()} ano={2026} />);
    expect(screen.getByText(/2025-01-01/)).toBeTruthy();
  });

  it('Salvar button is disabled when no colaborador selected', () => {
    render(<NovaProgramacaoDialog open onOpenChange={vi.fn()} ano={2026} />);
    const salvarBtn = screen.getByText('Salvar').closest('button');
    expect(salvarBtn).toBeDisabled();
  });

  it('calls onOpenChange(false) when Cancelar clicked', () => {
    const onOpenChange = vi.fn();
    render(<NovaProgramacaoDialog open onOpenChange={onOpenChange} ano={2026} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls criar.mutateAsync when Salvar clicked with colaborador', async () => {
    render(<NovaProgramacaoDialog open onOpenChange={vi.fn()} ano={2026} />);
    const selects = screen.getAllByTestId('select');
    fireEvent.change(selects[0], { target: { value: 'col-1' } });

    fireEvent.click(screen.getByText('Salvar').closest('button')!);

    await vi.waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ colaborador_id: 'col-1', ano: 2026 })
    ));
  });
});
