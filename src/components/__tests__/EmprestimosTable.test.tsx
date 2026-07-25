import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div role="progressbar" aria-valuenow={value} />,
}));

import { EmprestimosTable } from '../descontos/EmprestimosTable';

const fmt = (v: number) => `R$ ${v.toFixed(2)}`;

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
