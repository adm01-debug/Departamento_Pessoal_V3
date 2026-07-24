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

  it('renders "Justa Causa" for tipo com_justa_causa', () => {
    render(<TipoBadge tipo="com_justa_causa" />);
    expect(screen.getByText('Justa Causa')).toBeInTheDocument();
  });

  it('renders "Pedido Demissão" for tipo pedido_demissao', () => {
    render(<TipoBadge tipo="pedido_demissao" />);
    expect(screen.getByText('Pedido Demissão')).toBeInTheDocument();
  });

  it('renders "Acordo Mútuo" for tipo acordo_mutuo', () => {
    render(<TipoBadge tipo="acordo_mutuo" />);
    expect(screen.getByText('Acordo Mútuo')).toBeInTheDocument();
  });

  it('renders "Término Contrato" for tipo termino_contrato', () => {
    render(<TipoBadge tipo="termino_contrato" />);
    expect(screen.getByText('Término Contrato')).toBeInTheDocument();
  });

  it('renders raw tipo for unknown tipo', () => {
    render(<TipoBadge tipo="nova_modalidade" />);
    expect(screen.getByText('nova_modalidade')).toBeInTheDocument();
  });
});
