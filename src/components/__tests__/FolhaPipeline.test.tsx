import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/PageTitle', () => ({
  PageTitle: ({ children }: any) => <title>{children}</title>,
}));

import { FolhaPipeline } from '../folha/FolhaPipeline';

const STATUS_PENDING = {
  ponto: 'pendente',
  lancamentos: 'pendente',
  calculo: 'pendente',
  conferencia: 'pendente',
  fechamento: 'pendente',
};

const STATUS_MIXED = {
  ponto: 'importado',
  lancamentos: 'executado',
  calculo: 'pendente',
  conferencia: 'pendente',
  fechamento: 'pendente',
};

describe('FolhaPipeline', () => {
  it('renders Pipeline de Processamento title', () => {
    render(<FolhaPipeline status={STATUS_PENDING} competencia="2024-07" />);
    expect(screen.getByText('Pipeline de Processamento')).toBeInTheDocument();
  });

  it('shows competencia badge', () => {
    render(<FolhaPipeline status={STATUS_PENDING} competencia="2024-07" />);
    expect(screen.getByText('2024-07')).toBeInTheDocument();
  });

  it('renders all 5 step labels', () => {
    render(<FolhaPipeline status={STATUS_PENDING} competencia="2024-07" />);
    expect(screen.getByText('Importar Ponto')).toBeInTheDocument();
    expect(screen.getByText('Lançamentos')).toBeInTheDocument();
    expect(screen.getByText('Cálculo')).toBeInTheDocument();
    expect(screen.getByText('Conferência')).toBeInTheDocument();
    expect(screen.getByText('Fechamento')).toBeInTheDocument();
  });

  it('renders step descriptions', () => {
    render(<FolhaPipeline status={STATUS_PENDING} competencia="2024-07" />);
    expect(screen.getByText('Dados do ponto eletrônico')).toBeInTheDocument();
    expect(screen.getByText('Processamento da folha')).toBeInTheDocument();
  });

  it('shows Pendente badges for all pending steps', () => {
    render(<FolhaPipeline status={STATUS_PENDING} competencia="2024-07" />);
    const pendentes = screen.getAllByText('Pendente');
    expect(pendentes.length).toBe(5);
  });

  it('shows Importado badge for ponto step when importado', () => {
    render(<FolhaPipeline status={STATUS_MIXED} competencia="2024-07" />);
    expect(screen.getByText('Importado')).toBeInTheDocument();
  });
});
