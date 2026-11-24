import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, TipoBadge } from '../desligamentos/DesligamentoStatusBadge';

describe('StatusBadge', () => {
  it('renders "Pendente" for status pendente', () => {
    render(<StatusBadge status="pendente" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('renders "Em Andamento" for status em_andamento', () => {
    render(<StatusBadge status="em_andamento" />);
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();
  });

  it('renders "Concluído" for status concluido', () => {
    render(<StatusBadge status="concluido" />);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('renders "Cancelado" for status cancelado', () => {
    render(<StatusBadge status="cancelado" />);
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('renders raw status for unknown status', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });
});

describe('TipoBadge', () => {
  it('renders "Sem Justa Causa" for tipo sem_justa_causa', () => {
    render(<TipoBadge tipo="sem_justa_causa" />);
    expect(screen.getByText('Sem Justa Causa')).toBeInTheDocument();
  });

  it('renders "Justa Causa" for tipo justa_causa', () => {
    render(<TipoBadge tipo="justa_causa" />);
    expect(screen.getByText('Justa Causa')).toBeInTheDocument();
  });

  it('renders "Pedido Demissão" for tipo pedido_demissao', () => {
    render(<TipoBadge tipo="pedido_demissao" />);
    expect(screen.getByText('Pedido Demissão')).toBeInTheDocument();
  });

  it('renders "Acordo" for tipo acordo', () => {
    render(<TipoBadge tipo="acordo" />);
    expect(screen.getByText('Acordo')).toBeInTheDocument();
  });

  it('renders "Fim de Contrato" for tipo fim_contrato', () => {
    render(<TipoBadge tipo="fim_contrato" />);
    expect(screen.getByText('Fim de Contrato')).toBeInTheDocument();
  });

  it('renders raw tipo for unknown tipo', () => {
    render(<TipoBadge tipo="nova_modalidade" />);
    expect(screen.getByText('nova_modalidade')).toBeInTheDocument();
  });
});
