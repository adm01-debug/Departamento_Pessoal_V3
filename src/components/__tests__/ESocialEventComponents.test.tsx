import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { S2200Admissao } from '../esocial/NaoPeriodicos';
import { S2220ASO } from '../esocial/SSTEvents';
import { S1200Remuneracao } from '../esocial/Periodicos';

const ADMISSAO_DADOS = {
  nmTrab: 'Carlos Mendes',
  cpfTrab: '123.456.789-00',
  matricula: 'EMP001',
  codCateg: '101',
  dtAdm: '2024-01-15',
  tpRegTrab: '1',
  nmCargo: 'Analista',
  cbos: '2521-05',
  vrSalFx: 5000,
  undSalFixo: 'Mensal',
};

const ASO_DADOS = {
  cpfTrab: '987.654.321-00',
  dtExame: '2024-07-01',
  tpExame: '1',
};

const S1200_DADOS = {
  cpfTrab: '111.222.333-44',
  perApur: '2024-07',
  dmDev: [],
};

describe('S2200Admissao (NaoPeriodicos)', () => {
  it('renders trabalhador name', () => {
    render(<S2200Admissao dados={ADMISSAO_DADOS} />);
    expect(screen.getByText('Carlos Mendes')).toBeInTheDocument();
  });

  it('renders CPF', () => {
    render(<S2200Admissao dados={ADMISSAO_DADOS} />);
    expect(screen.getByText(/123\.456\.789-00/)).toBeInTheDocument();
  });

  it('renders admissao date', () => {
    render(<S2200Admissao dados={ADMISSAO_DADOS} />);
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
  });

  it('renders cargo', () => {
    render(<S2200Admissao dados={ADMISSAO_DADOS} />);
    expect(screen.getByText('Analista')).toBeInTheDocument();
  });
});

describe('S2220ASO (SSTEvents)', () => {
  it('renders CPF', () => {
    render(<S2220ASO dados={ASO_DADOS} />);
    expect(screen.getByText(/987\.654\.321-00/)).toBeInTheDocument();
  });

  it('renders exam date', () => {
    render(<S2220ASO dados={ASO_DADOS} />);
    expect(screen.getByText('2024-07-01')).toBeInTheDocument();
  });

  it('renders Admissional exam type', () => {
    render(<S2220ASO dados={ASO_DADOS} />);
    expect(screen.getByText('Admissional')).toBeInTheDocument();
  });

  it('renders Apto result', () => {
    render(<S2220ASO dados={ASO_DADOS} />);
    expect(screen.getByText('Apto')).toBeInTheDocument();
  });
});

describe('S1200Remuneracao (Periodicos)', () => {
  it('renders trabalhador label', () => {
    render(<S1200Remuneracao dados={S1200_DADOS} />);
    expect(screen.getByText('Trabalhador')).toBeInTheDocument();
  });

  it('renders CPF', () => {
    render(<S1200Remuneracao dados={S1200_DADOS} />);
    expect(screen.getByText(/111\.222\.333-44/)).toBeInTheDocument();
  });

  it('renders Período Apuração', () => {
    render(<S1200Remuneracao dados={S1200_DADOS} />);
    expect(screen.getByText('Período Apuração')).toBeInTheDocument();
  });

  it('renders period value', () => {
    render(<S1200Remuneracao dados={S1200_DADOS} />);
    expect(screen.getByText('2024-07')).toBeInTheDocument();
  });
});
