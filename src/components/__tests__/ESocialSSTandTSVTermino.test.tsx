import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { S2210SST } from '../esocial/S2210SST';
import { S2399TSVTermino } from '../esocial/S2399TSVTermino';

const S2210_DADOS = {
  cpfTrab: '321.654.987-00',
  nmTrab: 'Roberto Alves',
  dtAcid: '2024-03-20',
  hrAcid: '10:30',
  tpAcid: '1',
  iniCAT: '1',
  localAcid: 'Galpão de produção',
};

const S2399_DADOS = {
  cpfTrab: '111.333.555-77',
  matricula: 'TSV-007',
  dtTerm: '2024-08-31',
  mtvDeslig: 'Conclusão do projeto',
  verbasResc: 'S',
};

describe('S2210SST', () => {
  it('renders CPF do trabalhador', () => {
    render(<S2210SST dados={S2210_DADOS} />);
    expect(screen.getByText(/321\.654\.987-00/)).toBeInTheDocument();
  });

  it('renders nome do trabalhador', () => {
    render(<S2210SST dados={S2210_DADOS} />);
    expect(screen.getByText('Roberto Alves')).toBeInTheDocument();
  });

  it('renders data do acidente', () => {
    render(<S2210SST dados={S2210_DADOS} />);
    expect(screen.getByText('2024-03-20')).toBeInTheDocument();
  });

  it('renders tipo Típico when tpAcid is 1', () => {
    render(<S2210SST dados={S2210_DADOS} />);
    expect(screen.getByText('Típico')).toBeInTheDocument();
  });

  it('renders iniciativa Empregador when iniCAT is 1', () => {
    render(<S2210SST dados={S2210_DADOS} />);
    expect(screen.getByText('Empregador')).toBeInTheDocument();
  });

  it('renders Detalhes da Ocorrência label', () => {
    render(<S2210SST dados={S2210_DADOS} />);
    expect(screen.getByText('Detalhes da Ocorrência')).toBeInTheDocument();
  });
});

describe('S2399TSVTermino', () => {
  it('renders CPF', () => {
    render(<S2399TSVTermino dados={S2399_DADOS} />);
    expect(screen.getByText(/111\.333\.555-77/)).toBeInTheDocument();
  });

  it('renders data de término', () => {
    render(<S2399TSVTermino dados={S2399_DADOS} />);
    expect(screen.getByText('2024-08-31')).toBeInTheDocument();
  });

  it('renders motivo de desligamento', () => {
    render(<S2399TSVTermino dados={S2399_DADOS} />);
    expect(screen.getByText('Conclusão do projeto')).toBeInTheDocument();
  });

  it('renders verbas rescisórias when verbasResc is S', () => {
    render(<S2399TSVTermino dados={S2399_DADOS} />);
    expect(screen.getByText('Sim, há valores a pagar')).toBeInTheDocument();
  });

  it('renders Detalhes do Desligamento label', () => {
    render(<S2399TSVTermino dados={S2399_DADOS} />);
    expect(screen.getByText('Detalhes do Desligamento')).toBeInTheDocument();
  });
});
