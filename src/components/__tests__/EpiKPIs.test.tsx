import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children?: ReactNode; asChild?: boolean }) =>
    asChild ? children : <div>{children}</div>,
  TooltipContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

import { EpiKPIs } from '../epis/EpiKPIs';

const STATS = {
  totalEpis: 12,
  totalEntregas: 45,
  categoriasCobertas: 6,
  comCA: 10,
  semCA: 2,
  vencimentoProximo: 3,
  estoqueBaixo: 1,
  totalEstoque: 200,
};

describe('EpiKPIs', () => {
  it('renders Modelos EPI label', () => {
    render(<EpiKPIs stats={STATS} />);
    expect(screen.getByText('Modelos EPI')).toBeInTheDocument();
  });

  it('renders Itens em Estoque label', () => {
    render(<EpiKPIs stats={STATS} />);
    expect(screen.getByText('Itens em Estoque')).toBeInTheDocument();
  });

  it('renders Conformes (CA) label', () => {
    render(<EpiKPIs stats={STATS} />);
    expect(screen.getByText('Conformes (CA)')).toBeInTheDocument();
  });

  it('renders Estoque Baixo label', () => {
    render(<EpiKPIs stats={STATS} />);
    expect(screen.getByText('Estoque Baixo')).toBeInTheDocument();
  });

  it('renders A Substituir label', () => {
    render(<EpiKPIs stats={STATS} />);
    expect(screen.getByText('A Substituir')).toBeInTheDocument();
  });

  it('renders Irregulares label', () => {
    render(<EpiKPIs stats={STATS} />);
    expect(screen.getByText('Irregulares')).toBeInTheDocument();
  });

  it('shows NR-6 alert when semCA > 0', () => {
    render(<EpiKPIs stats={STATS} />);
    expect(screen.getByText(/sem Certificado de Aprovação/)).toBeInTheDocument();
  });

  it('does not show NR-6 alert when semCA is 0', () => {
    render(<EpiKPIs stats={{ ...STATS, semCA: 0 }} />);
    expect(screen.queryByText(/sem Certificado de Aprovação/)).not.toBeInTheDocument();
  });
});
