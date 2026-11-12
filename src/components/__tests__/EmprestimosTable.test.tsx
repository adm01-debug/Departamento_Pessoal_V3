import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children?: ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children?: ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children?: ReactNode }) => <td>{children}</td>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value?: number }) => <div role="progressbar" aria-valuenow={value} />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    'aria-label': ariaLabel,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'aria-label'?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

import { EmprestimosTable } from '../descontos/EmprestimosTable';

const fmt = (v: number | null) => `R$ ${(v ?? 0).toFixed(2)}`;

const MOCK_EMPRESTIMOS = [
  {
    id: 'e1',
    colaborador: { nome_completo: 'Carlos Silva' },
    instituicao_financeira: 'Banco do Brasil',
    valor_total: 10000,
    valor_parcela: 500,
    parcelas_pagas: 5,
    numero_parcelas: 20,
    status: 'ativo',
  },
];

describe('EmprestimosTable', () => {
  it('shows empty state when no emprestimos', () => {
    render(<EmprestimosTable emprestimos={[]} fmt={fmt} />);
    expect(screen.getByText('Nenhum empréstimo registrado.')).toBeInTheDocument();
  });

  it('renders Colaborador header', () => {
    render(<EmprestimosTable emprestimos={[]} fmt={fmt} />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders Instituição header', () => {
    render(<EmprestimosTable emprestimos={[]} fmt={fmt} />);
    expect(screen.getByText('Instituição')).toBeInTheDocument();
  });

  it('renders Valor Total header', () => {
    render(<EmprestimosTable emprestimos={[]} fmt={fmt} />);
    expect(screen.getByText('Valor Total')).toBeInTheDocument();
  });

  it('renders Parcela header', () => {
    render(<EmprestimosTable emprestimos={[]} fmt={fmt} />);
    expect(screen.getByText('Parcela')).toBeInTheDocument();
  });

  it('renders Status header', () => {
    render(<EmprestimosTable emprestimos={[]} fmt={fmt} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders colaborador name', () => {
    render(<EmprestimosTable emprestimos={MOCK_EMPRESTIMOS} fmt={fmt} />);
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
  });

  it('renders instituicao_financeira', () => {
    render(<EmprestimosTable emprestimos={MOCK_EMPRESTIMOS} fmt={fmt} />);
    expect(screen.getByText('Banco do Brasil')).toBeInTheDocument();
  });

  it('sem onUpdate não renderiza a coluna de ações', () => {
    render(<EmprestimosTable emprestimos={MOCK_EMPRESTIMOS} fmt={fmt} />);
    expect(screen.queryByText('Ações')).not.toBeInTheDocument();
  });

  it('dispara quitar, cancelar e registrar parcela para empréstimo ativo', () => {
    const onUpdate = vi.fn();
    render(<EmprestimosTable emprestimos={MOCK_EMPRESTIMOS} fmt={fmt} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByLabelText('Registrar parcela paga'));
    expect(onUpdate).toHaveBeenLastCalledWith({ id: 'e1', patch: { parcelas_pagas: 6 } });
    fireEvent.click(screen.getByLabelText('Quitar'));
    expect(onUpdate).toHaveBeenLastCalledWith({ id: 'e1', patch: { status: 'quitado' } });
    fireEvent.click(screen.getByLabelText('Cancelar'));
    expect(onUpdate).toHaveBeenLastCalledWith({ id: 'e1', patch: { status: 'cancelado' } });
  });

  it('última parcela registrada quita o empréstimo', () => {
    const onUpdate = vi.fn();
    render(
      <EmprestimosTable emprestimos={[{ ...MOCK_EMPRESTIMOS[0], parcelas_pagas: 19 }]} fmt={fmt} onUpdate={onUpdate} />
    );
    fireEvent.click(screen.getByLabelText('Registrar parcela paga'));
    expect(onUpdate).toHaveBeenCalledWith({ id: 'e1', patch: { parcelas_pagas: 20, status: 'quitado' } });
  });

  it('não exibe ações para empréstimo já quitado', () => {
    render(
      <EmprestimosTable emprestimos={[{ ...MOCK_EMPRESTIMOS[0], status: 'quitado' }]} fmt={fmt} onUpdate={vi.fn()} />
    );
    expect(screen.queryByLabelText('Quitar')).not.toBeInTheDocument();
  });
});
