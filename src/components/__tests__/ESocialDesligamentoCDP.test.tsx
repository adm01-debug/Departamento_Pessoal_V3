import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { S2299Desligamento } from '../esocial/S2299Desligamento';
import { S2400CDP } from '../esocial/S2400CDP';

const S2299_DADOS = {
  cpfTrab: '123.456.789-00',
  matricula: 'EMP-042',
  dtDeslig: '2024-06-30',
  mtvDeslig: 'Pedido de demissão',
  tpAviso: '1',
  verbasResc: 'S',
};

const S2400_DADOS = {
  cpfBenef: '987.654.321-00',
  nmBenef: 'Maria Oliveira',
  dtIniBenef: '2024-07-01',
  tpBenef: 'Aposentadoria',
  indOrigemBenef: '2',
};

describe('S2299Desligamento', () => {
  it('renders CPF do trabalhador', () => {
    render(<S2299Desligamento dados={S2299_DADOS} />);
    expect(screen.getByText(/123\.456\.789-00/)).toBeInTheDocument();
  });

  it('renders data do desligamento', () => {
    render(<S2299Desligamento dados={S2299_DADOS} />);
    expect(screen.getByText('2024-06-30')).toBeInTheDocument();
  });

  it('renders motivo do desligamento', () => {
    render(<S2299Desligamento dados={S2299_DADOS} />);
    expect(screen.getByText('Pedido de demissão')).toBeInTheDocument();
  });

  it('renders aviso prévio trabalhado when tpAviso is 1', () => {
    render(<S2299Desligamento dados={S2299_DADOS} />);
    expect(screen.getByText('Trabalhado')).toBeInTheDocument();
  });

  it('renders verbas rescisórias when verbasResc is S', () => {
    render(<S2299Desligamento dados={S2299_DADOS} />);
    expect(screen.getByText('Há valores a pagar')).toBeInTheDocument();
  });

  it('renders Detalhes da Rescisão label', () => {
    render(<S2299Desligamento dados={S2299_DADOS} />);
    expect(screen.getByText('Detalhes da Rescisão')).toBeInTheDocument();
  });
});

describe('S2400CDP', () => {
  it('renders CPF do beneficiário', () => {
    render(<S2400CDP dados={S2400_DADOS} />);
    expect(screen.getByText(/987\.654\.321-00/)).toBeInTheDocument();
  });

  it('renders nome do beneficiário', () => {
    render(<S2400CDP dados={S2400_DADOS} />);
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
  });

  it('renders data de início do benefício', () => {
    render(<S2400CDP dados={S2400_DADOS} />);
    expect(screen.getByText('2024-07-01')).toBeInTheDocument();
  });

  it('renders tipo do benefício', () => {
    render(<S2400CDP dados={S2400_DADOS} />);
    expect(screen.getByText('Aposentadoria')).toBeInTheDocument();
  });

  it('renders Concessão Administrativa when indOrigemBenef is 2', () => {
    render(<S2400CDP dados={S2400_DADOS} />);
    expect(screen.getByText('Concessão Administrativa')).toBeInTheDocument();
  });

  it('renders Informações do Benefício label', () => {
    render(<S2400CDP dados={S2400_DADOS} />);
    expect(screen.getByText('Informações do Benefício')).toBeInTheDocument();
  });
});
