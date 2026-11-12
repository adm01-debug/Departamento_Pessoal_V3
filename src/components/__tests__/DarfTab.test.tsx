import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DarfTab } from '../obrigacoes/DarfTab';

describe('DarfTab', () => {
  it('renders DARF title', () => {
    render(<DarfTab totalIrrf={1000} competencia="06/2024" />);
    expect(screen.getAllByText(/DARF/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders IRRF label', () => {
    render(<DarfTab totalIrrf={0} competencia="06/2024" />);
    expect(screen.getByText(/IRRF \(Código 0561\)/)).toBeInTheDocument();
  });

  it('does not render non-payroll taxes (PIS/COFINS, CSLL)', () => {
    render(<DarfTab totalIrrf={0} competencia="06/2024" />);
    expect(screen.queryByText(/PIS\/COFINS/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CSLL/)).not.toBeInTheDocument();
  });

  it('renders IRRF due date label', () => {
    render(<DarfTab totalIrrf={0} competencia="06/2024" />);
    expect(screen.getByText(/Venc\. dia 20/)).toBeInTheDocument();
  });

  it('shows the IRRF withheld in the payroll as-is', () => {
    render(<DarfTab totalIrrf={2345.67} competencia="06/2024" />);
    expect(screen.getByText(/2\.345,67/)).toBeInTheDocument();
    expect(screen.getByText(/IRRF retido na folha mensal de 06\/2024/)).toBeInTheDocument();
  });

  it('shows empty state when there is no payroll for the competencia', () => {
    render(<DarfTab totalIrrf={null} competencia="06/2024" />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma folha mensal calculada para 06\/2024/)).toBeInTheDocument();
  });

  it('shows loading and error states', () => {
    const { rerender } = render(<DarfTab totalIrrf={null} competencia="06/2024" isLoading />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    rerender(<DarfTab totalIrrf={null} competencia="06/2024" isError />);
    expect(screen.getByText('Erro ao carregar')).toBeInTheDocument();
  });
});
