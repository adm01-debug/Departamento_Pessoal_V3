import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinancialSummaryCards } from '../descontos/FinancialSummaryCards';

const fmt = (v: number) => `R$${v}`;

const EMPRESTIMOS = [
  { id: '1', status: 'ativo', valor_parcela: 500 },
  { id: '2', status: 'ativo', valor_parcela: 300 },
  { id: '3', status: 'quitado', valor_parcela: 200 },
];

const ADIANTAMENTOS = [
  { id: '1', status: 'pendente', valor_solicitado: '1000' },
  { id: '2', status: 'pendente', valor_solicitado: '500' },
  { id: '3', status: 'aprovado', valor_solicitado: '800' },
];

describe('FinancialSummaryCards', () => {
  it('renders Empréstimos Ativos label', () => {
    render(<FinancialSummaryCards emprestimos={EMPRESTIMOS} adiantamentos={[]} fmt={fmt} />);
    expect(screen.getByText('Empréstimos Ativos')).toBeInTheDocument();
  });

  it('renders Adiantamentos Pendentes label', () => {
    render(<FinancialSummaryCards emprestimos={[]} adiantamentos={ADIANTAMENTOS} fmt={fmt} />);
    expect(screen.getByText('Adiantamentos Pendentes')).toBeInTheDocument();
  });

  it('renders Alertas de Margem label', () => {
    render(<FinancialSummaryCards emprestimos={[]} adiantamentos={[]} fmt={fmt} />);
    expect(screen.getByText('Alertas de Margem')).toBeInTheDocument();
  });

  it('counts only active emprestimos', () => {
    render(<FinancialSummaryCards emprestimos={EMPRESTIMOS} adiantamentos={[]} fmt={fmt} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('counts only pending adiantamentos', () => {
    render(<FinancialSummaryCards emprestimos={[]} adiantamentos={ADIANTAMENTOS} fmt={fmt} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders margin alerts as 0', () => {
    render(<FinancialSummaryCards emprestimos={[]} adiantamentos={[]} fmt={fmt} />);
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  it('calls fmt for total retido sum of active parcelas', () => {
    render(<FinancialSummaryCards emprestimos={EMPRESTIMOS} adiantamentos={[]} fmt={fmt} />);
    expect(screen.getByText(/R\$800/)).toBeInTheDocument();
  });
});
