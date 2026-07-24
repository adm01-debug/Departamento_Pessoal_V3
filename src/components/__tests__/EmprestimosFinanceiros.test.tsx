import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmprestimosTable } from '../descontos/EmprestimosTable';
import { FinancialSummaryCards } from '../descontos/FinancialSummaryCards';

const fmt = (v: number) => `R$ ${v.toFixed(2)}`;

const EMPRESTIMOS = [
  {
    id: '1',
    colaborador: { nome_completo: 'Carlos Mendes' },
    instituicao_financeira: 'Bradesco',
    valor_total: 5000,
    valor_parcela: 500,
    numero_parcelas: 10,
    parcelas_pagas: 3,
    status: 'ativo',
  },
  {
    id: '2',
    colaborador: { nome_completo: 'Lúcia Ferreira' },
    instituicao_financeira: null,
    valor_total: 2000,
    valor_parcela: 200,
    numero_parcelas: 10,
    parcelas_pagas: 10,
    status: 'quitado',
  },
];

const ADIANTAMENTOS = [
  { id: 'a1', status: 'pendente', valor_solicitado: 1000 },
  { id: 'a2', status: 'aprovado', valor_solicitado: 500 },
];

describe('EmprestimosTable', () => {
  it('renders table headers', () => {
    render(<EmprestimosTable emprestimos={EMPRESTIMOS} fmt={fmt} />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
    expect(screen.getByText('Instituição')).toBeInTheDocument();
    expect(screen.getByText('Progresso')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders colaborador names', () => {
    render(<EmprestimosTable emprestimos={EMPRESTIMOS} fmt={fmt} />);
    expect(screen.getByText('Carlos Mendes')).toBeInTheDocument();
    expect(screen.getByText('Lúcia Ferreira')).toBeInTheDocument();
  });

  it('renders instituicao or dash for null', () => {
    render(<EmprestimosTable emprestimos={EMPRESTIMOS} fmt={fmt} />);
    expect(screen.getByText('Bradesco')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders progress fractions', () => {
    render(<EmprestimosTable emprestimos={EMPRESTIMOS} fmt={fmt} />);
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
    expect(screen.getByText('10 / 10')).toBeInTheDocument();
  });

  it('shows empty state when no emprestimos', () => {
    render(<EmprestimosTable emprestimos={[]} fmt={fmt} />);
    expect(screen.getByText('Nenhum empréstimo registrado.')).toBeInTheDocument();
  });
});

describe('FinancialSummaryCards', () => {
  it('renders Empréstimos Ativos label', () => {
    render(<FinancialSummaryCards emprestimos={EMPRESTIMOS} adiantamentos={ADIANTAMENTOS} fmt={fmt} />);
    expect(screen.getByText('Empréstimos Ativos')).toBeInTheDocument();
  });

  it('renders Adiantamentos Pendentes label', () => {
    render(<FinancialSummaryCards emprestimos={EMPRESTIMOS} adiantamentos={ADIANTAMENTOS} fmt={fmt} />);
    expect(screen.getByText('Adiantamentos Pendentes')).toBeInTheDocument();
  });

  it('shows count of active emprestimos (1)', () => {
    render(<FinancialSummaryCards emprestimos={EMPRESTIMOS} adiantamentos={ADIANTAMENTOS} fmt={fmt} />);
    // 1 ativo
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Alertas de Margem card', () => {
    render(<FinancialSummaryCards emprestimos={EMPRESTIMOS} adiantamentos={ADIANTAMENTOS} fmt={fmt} />);
    expect(screen.getByText('Alertas de Margem')).toBeInTheDocument();
  });
});
