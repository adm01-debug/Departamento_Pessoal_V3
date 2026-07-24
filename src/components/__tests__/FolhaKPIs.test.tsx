import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  useInView: () => true,
}));

vi.mock('@/components/dashboard/AnimatedNumber', () => ({
  AnimatedNumber: ({ value, format }: any) => (
    <span>{format ? format(value) : String(value)}</span>
  ),
}));

vi.mock('@/components/ui/module-skeleton', () => ({
  KPICardSkeleton: () => <div data-testid="kpi-skeleton" />,
}));

import { FolhaKPIs } from '../folha/FolhaKPIs';

const MOCK_RESUMO = {
  colaboradores: 42,
  totalProventos: 150000,
  totalDescontos: 30000,
  liquido: 120000,
  inss: 15000,
  fgts: 12000,
  irrf: 8000,
  custoTotalEmpresa: 180000,
};

describe('FolhaKPIs', () => {
  it('shows skeleton cards when loading', () => {
    render(<FolhaKPIs resumo={undefined} isLoading={true} />);
    const skeletons = screen.getAllByTestId('kpi-skeleton');
    expect(skeletons.length).toBe(6);
  });

  it('renders Colaboradores label', () => {
    render(<FolhaKPIs resumo={MOCK_RESUMO} isLoading={false} />);
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
  });

  it('renders Total Bruto label', () => {
    render(<FolhaKPIs resumo={MOCK_RESUMO} isLoading={false} />);
    expect(screen.getByText('Total Bruto')).toBeInTheDocument();
  });

  it('renders Total Descontos label', () => {
    render(<FolhaKPIs resumo={MOCK_RESUMO} isLoading={false} />);
    expect(screen.getByText('Total Descontos')).toBeInTheDocument();
  });

  it('renders Líquido Total label', () => {
    render(<FolhaKPIs resumo={MOCK_RESUMO} isLoading={false} />);
    expect(screen.getByText('Líquido Total')).toBeInTheDocument();
  });

  it('renders IRRF Retido label', () => {
    render(<FolhaKPIs resumo={MOCK_RESUMO} isLoading={false} />);
    expect(screen.getByText('IRRF Retido')).toBeInTheDocument();
  });

  it('renders Custo Empresa label', () => {
    render(<FolhaKPIs resumo={MOCK_RESUMO} isLoading={false} />);
    expect(screen.getByText('Custo Empresa')).toBeInTheDocument();
  });

  it('renders with undefined resumo without crashing', () => {
    const { container } = render(<FolhaKPIs resumo={undefined} isLoading={false} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
