import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

import { FolhaComposicao } from '../folha/FolhaComposicao';

const PROPS = {
  totalProventos: 5000,
  inss: 550,
  irrf: 200,
  fgts: 400,
  totalDescontos: 900,
  horasExtras: 0,
  dsr: 0,
  decimoTerceiro: 0,
  horasFalta: 0,
  faixaInss: '12%',
  faixaIrrf: '7.5%',
};

describe('FolhaComposicao', () => {
  it('renders Composição da Folha title', () => {
    render(<FolhaComposicao {...PROPS} />);
    expect(screen.getByText('Composição da Folha')).toBeInTheDocument();
  });

  it('renders Salário Base + Adicionais item', () => {
    render(<FolhaComposicao {...PROPS} />);
    expect(screen.getByText('Salário Base + Adicionais')).toBeInTheDocument();
  });

  it('renders INSS label with faixa', () => {
    render(<FolhaComposicao {...PROPS} />);
    expect(screen.getByText('INSS (Faixa: 12%)')).toBeInTheDocument();
  });

  it('renders IRRF label with faixa', () => {
    render(<FolhaComposicao {...PROPS} />);
    expect(screen.getByText('IRRF (Faixa: 7.5%)')).toBeInTheDocument();
  });

  it('renders FGTS Patronal item', () => {
    render(<FolhaComposicao {...PROPS} />);
    expect(screen.getByText('FGTS (Patronal)')).toBeInTheDocument();
  });

  it('filters out zero-value optional items', () => {
    render(<FolhaComposicao {...PROPS} />);
    expect(screen.queryByText('Horas Extras (50% e 100%)')).not.toBeInTheDocument();
    expect(screen.queryByText('DSR (Descanso Remunerado)')).not.toBeInTheDocument();
  });

  it('shows horas extras when non-zero', () => {
    render(<FolhaComposicao {...PROPS} horasExtras={300} />);
    expect(screen.getByText('Horas Extras (50% e 100%)')).toBeInTheDocument();
  });
});
