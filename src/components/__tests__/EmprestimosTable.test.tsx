import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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
});
