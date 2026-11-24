import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { PortalFinanceiroTab } from '../portal/PortalFinanceiroTab';

const MOCK_HOLERITES = [
  { competencia: '2026-06', total_proventos: 5000, total_liquido: 4100 },
  { competencia: '2026-05', total_proventos: 5000, total_liquido: 4100 },
];

const MOCK_BENEFICIOS = [
  { nome: 'Vale Refeição', tipo: 'Alimentação', valor: 600 },
  { nome: 'Plano de Saúde', tipo: 'Saúde', valor: 200 },
];

describe('PortalFinanceiroTab', () => {
  it('renders Meus Holerites section title', () => {
    render(<PortalFinanceiroTab holerites={[]} beneficios={[]} />);
    expect(screen.getByText('Meus Holerites')).toBeInTheDocument();
  });

  it('renders Meus Benefícios section title', () => {
    render(<PortalFinanceiroTab holerites={[]} beneficios={[]} />);
    expect(screen.getByText('Meus Benefícios')).toBeInTheDocument();
  });

  it('shows empty holerites message', () => {
    render(<PortalFinanceiroTab holerites={[]} beneficios={[]} />);
    expect(screen.getByText('Nenhum holerite encontrado')).toBeInTheDocument();
  });

  it('shows empty beneficios message', () => {
    render(<PortalFinanceiroTab holerites={[]} beneficios={[]} />);
    expect(screen.getByText('Nenhum benefício ativo')).toBeInTheDocument();
  });

  it('renders holerite competencia when data provided', () => {
    render(<PortalFinanceiroTab holerites={MOCK_HOLERITES} beneficios={[]} />);
    expect(screen.getByText('2026-06')).toBeInTheDocument();
  });

  it('renders Líquido label for holerite', () => {
    render(<PortalFinanceiroTab holerites={MOCK_HOLERITES} beneficios={[]} />);
    const labels = screen.getAllByText('Líquido');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders beneficio nome when data provided', () => {
    render(<PortalFinanceiroTab holerites={[]} beneficios={MOCK_BENEFICIOS} />);
    expect(screen.getByText('Vale Refeição')).toBeInTheDocument();
  });

  it('renders beneficio tipo badge', () => {
    render(<PortalFinanceiroTab holerites={[]} beneficios={MOCK_BENEFICIOS} />);
    expect(screen.getByText('Alimentação')).toBeInTheDocument();
  });
});
