import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, TipoBadge } from '../desligamentos/DesligamentoStatusBadge';

describe('StatusBadge', () => {
  it('renders Pendente for pendente status', () => {
    render(<StatusBadge status="pendente" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('renders Em Andamento for em_andamento', () => {
    render(<StatusBadge status="em_andamento" />);
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();
  });

  it('renders Concluído for concluido', () => {
    render(<StatusBadge status="concluido" />);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('renders Cancelado for cancelado', () => {
    render(<StatusBadge status="cancelado" />);
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('renders raw label for unknown status', () => {
    render(<StatusBadge status="desconhecido" />);
    expect(screen.getByText('desconhecido')).toBeInTheDocument();
  });
});

describe('TipoBadge', () => {
  it('renders Sem Justa Causa for sem_justa_causa', () => {
    render(<TipoBadge tipo="sem_justa_causa" />);
    expect(screen.getByText('Sem Justa Causa')).toBeInTheDocument();
  });

  it('renders Justa Causa for com_justa_causa', () => {
    render(<TipoBadge tipo="com_justa_causa" />);
    expect(screen.getByText('Justa Causa')).toBeInTheDocument();
  });

  it('renders Pedido Demissão for pedido_demissao', () => {
    render(<TipoBadge tipo="pedido_demissao" />);
    expect(screen.getByText('Pedido Demissão')).toBeInTheDocument();
  });

  it('renders Acordo Mútuo for acordo_mutuo', () => {
    render(<TipoBadge tipo="acordo_mutuo" />);
    expect(screen.getByText('Acordo Mútuo')).toBeInTheDocument();
  });

  it('renders Término Contrato for termino_contrato', () => {
    render(<TipoBadge tipo="termino_contrato" />);
    expect(screen.getByText('Término Contrato')).toBeInTheDocument();
  });
});
