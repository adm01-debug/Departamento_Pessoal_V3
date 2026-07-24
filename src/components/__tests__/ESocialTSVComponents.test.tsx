import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { S2300TSVInicio } from '../esocial/S2300TSVInicio';
import { S2306TSVAlteracao } from '../esocial/S2306TSVAlteracao';

const S2300_DADOS = {
  nmTrab: 'Pedro Santos',
  cpfTrab: '444.555.666-77',
  dtInicio: '2024-02-01',
  codCateg: '741',
  natAtividade: 1,
};

const S2306_DADOS = {
  cpfTrab: '888.777.666-55',
  nmTrab: 'Ana Costa',
  dtAlteracao: '2024-05-15',
  infoTSVAlteracao: {
    infoComplementar: {
      codCateg: '721',
    },
  },
};

describe('S2300TSVInicio', () => {
  it('renders trabalhador name', () => {
    render(<S2300TSVInicio dados={S2300_DADOS} />);
    expect(screen.getByText('Pedro Santos')).toBeInTheDocument();
  });

  it('renders CPF', () => {
    render(<S2300TSVInicio dados={S2300_DADOS} />);
    expect(screen.getByText(/444\.555\.666-77/)).toBeInTheDocument();
  });

  it('renders data de início', () => {
    render(<S2300TSVInicio dados={S2300_DADOS} />);
    expect(screen.getByText('2024-02-01')).toBeInTheDocument();
  });

  it('renders Urbana for natAtividade 1', () => {
    render(<S2300TSVInicio dados={S2300_DADOS} />);
    expect(screen.getByText('Urbana')).toBeInTheDocument();
  });

  it('renders codCateg', () => {
    render(<S2300TSVInicio dados={S2300_DADOS} />);
    expect(screen.getByText('741')).toBeInTheDocument();
  });

  it('renders Informações Contratuais label', () => {
    render(<S2300TSVInicio dados={S2300_DADOS} />);
    expect(screen.getByText('Informações Contratuais')).toBeInTheDocument();
  });
});

describe('S2306TSVAlteracao', () => {
  it('renders CPF', () => {
    render(<S2306TSVAlteracao dados={S2306_DADOS} />);
    expect(screen.getByText(/888\.777\.666-55/)).toBeInTheDocument();
  });

  it('renders trabalhador name', () => {
    render(<S2306TSVAlteracao dados={S2306_DADOS} />);
    expect(screen.getByText('Ana Costa')).toBeInTheDocument();
  });

  it('renders data da alteração', () => {
    render(<S2306TSVAlteracao dados={S2306_DADOS} />);
    expect(screen.getByText('2024-05-15')).toBeInTheDocument();
  });

  it('renders Alterações Realizadas label', () => {
    render(<S2306TSVAlteracao dados={S2306_DADOS} />);
    expect(screen.getByText('Alterações Realizadas')).toBeInTheDocument();
  });

  it('renders nova categoria when provided', () => {
    render(<S2306TSVAlteracao dados={S2306_DADOS} />);
    expect(screen.getByText('721')).toBeInTheDocument();
  });
});
