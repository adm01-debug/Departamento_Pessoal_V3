import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { S1210Pagamentos } from '../esocial/Periodicos';
import { S2240AgentesNocivos } from '../esocial/SSTEvents';

const S1210_DADOS_COM_PAGAMENTOS = {
  perApur: '2024-07',
  infoPgto: [
    { dtPgto: '2024-07-05', tpPgto: '2' },
    { dtPgto: '2024-07-20', tpPgto: '1' },
  ],
};

const S1210_DADOS_VAZIO = {
  perApur: '2024-08',
  infoPgto: [],
};

const S2240_DADOS = {
  cpfTrab: '555.444.333-22',
  infoExpRisco: [
    { codAgNoc: '02.01.001', dscAgNoc: 'Ruído', epcs: 'Enclausuramento acústico', limite: '85 dB' },
  ],
};

describe('S1210Pagamentos', () => {
  it('renders Rendimentos Pagos label', () => {
    render(<S1210Pagamentos dados={S1210_DADOS_COM_PAGAMENTOS} />);
    expect(screen.getByText(/Rendimentos Pagos ao Trabalhador/)).toBeInTheDocument();
  });

  it('renders payment dates', () => {
    render(<S1210Pagamentos dados={S1210_DADOS_COM_PAGAMENTOS} />);
    expect(screen.getByText(/Data de Pagamento: 2024-07-05/)).toBeInTheDocument();
  });

  it('renders perApur for competência', () => {
    render(<S1210Pagamentos dados={S1210_DADOS_COM_PAGAMENTOS} />);
    expect(screen.getAllByText('2024-07').length).toBeGreaterThanOrEqual(1);
  });

  it('renders tpPgto 1 as Ajuste Salarial', () => {
    render(<S1210Pagamentos dados={S1210_DADOS_COM_PAGAMENTOS} />);
    expect(screen.getByText('Ajuste Salarial')).toBeInTheDocument();
  });

  it('shows empty state when no pagamentos', () => {
    render(<S1210Pagamentos dados={S1210_DADOS_VAZIO} />);
    expect(screen.getByText(/Nenhum pagamento registrado/)).toBeInTheDocument();
  });
});

describe('S2240AgentesNocivos', () => {
  it('renders CPF do trabalhador', () => {
    render(<S2240AgentesNocivos dados={S2240_DADOS} />);
    expect(screen.getByText(/555\.444\.333-22/)).toBeInTheDocument();
  });

  it('renders Exposição a Agentes Nocivos label', () => {
    render(<S2240AgentesNocivos dados={S2240_DADOS} />);
    expect(screen.getByText(/Exposição a Agentes Nocivos/)).toBeInTheDocument();
  });

  it('renders agent code', () => {
    render(<S2240AgentesNocivos dados={S2240_DADOS} />);
    expect(screen.getByText(/Código Agente: 02\.01\.001/)).toBeInTheDocument();
  });

  it('renders Risco Detectado label', () => {
    render(<S2240AgentesNocivos dados={S2240_DADOS} />);
    expect(screen.getByText('Risco Detectado')).toBeInTheDocument();
  });

  it('renders without crash when no agents', () => {
    render(<S2240AgentesNocivos dados={{ cpfTrab: '000.000.000-00', infoExpRisco: [] }} />);
    expect(screen.getByText(/Exposição a Agentes Nocivos/)).toBeInTheDocument();
  });
});
