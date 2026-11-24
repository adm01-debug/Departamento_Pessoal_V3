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

  // `justa_causa` e o valor REAL do enum; `com_justa_causa` nunca existiu no
  // banco e o selo exibia o texto cru.
  it('renders Justa Causa for justa_causa', () => {
    render(<TipoBadge tipo="justa_causa" />);
    expect(screen.getByText('Justa Causa')).toBeInTheDocument();
  });

  it('renders Pedido Demissão for pedido_demissao', () => {
    render(<TipoBadge tipo="pedido_demissao" />);
    expect(screen.getByText('Pedido Demissão')).toBeInTheDocument();
  });

  it('renders Acordo for acordo', () => {
    render(<TipoBadge tipo="acordo" />);
    expect(screen.getByText('Acordo')).toBeInTheDocument();
  });

  it('renders Fim de Contrato for fim_contrato', () => {
    render(<TipoBadge tipo="fim_contrato" />);
    expect(screen.getByText('Fim de Contrato')).toBeInTheDocument();
  });

  it('renders Falecimento for falecimento', () => {
    render(<TipoBadge tipo="falecimento" />);
    expect(screen.getByText('Falecimento')).toBeInTheDocument();
  });
});
