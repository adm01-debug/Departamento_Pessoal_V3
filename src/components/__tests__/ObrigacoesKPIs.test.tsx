import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

import { ObrigacoesKPIs } from '../obrigacoes/ObrigacoesKPIs';

describe('ObrigacoesKPIs', () => {
  const BASE = {
    dctfCount: 12,
    sefipCount: 8,
    totalFgts: 'R$ 15.000,00',
    totalInss: 'R$ 9.500,00',
    guiasVencidas: 3,
  };

  it('renders DCTFWeb label', () => {
    render(<ObrigacoesKPIs {...BASE} />);
    expect(screen.getByText('DCTFWeb')).toBeInTheDocument();
  });

  it('renders SEFIP label', () => {
    render(<ObrigacoesKPIs {...BASE} />);
    expect(screen.getByText('SEFIP')).toBeInTheDocument();
  });

  it('renders Total FGTS label and value', () => {
    render(<ObrigacoesKPIs {...BASE} />);
    expect(screen.getByText('Total FGTS')).toBeInTheDocument();
    expect(screen.getByText('R$ 15.000,00')).toBeInTheDocument();
  });

  it('renders Total INSS label and value', () => {
    render(<ObrigacoesKPIs {...BASE} />);
    expect(screen.getByText('Total INSS')).toBeInTheDocument();
    expect(screen.getByText('R$ 9.500,00')).toBeInTheDocument();
  });

  it('renders Vencidas label and count', () => {
    render(<ObrigacoesKPIs {...BASE} />);
    expect(screen.getByText('Vencidas')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders dctfCount and sefipCount', () => {
    render(<ObrigacoesKPIs {...BASE} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders zero values without crash', () => {
    render(<ObrigacoesKPIs dctfCount={0} sefipCount={0} totalFgts="R$ 0,00" totalInss="R$ 0,00" guiasVencidas={0} />);
    expect(screen.getByText('DCTFWeb')).toBeInTheDocument();
  });
});
