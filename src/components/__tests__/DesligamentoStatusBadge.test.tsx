import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import { StatusBadge, TipoBadge } from '../desligamentos/DesligamentoStatusBadge';

describe('StatusBadge', () => {
  it('renders Pendente for pendente status', () => {
    render(<StatusBadge status="pendente" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('renders Em Andamento for em_andamento status', () => {
    render(<StatusBadge status="em_andamento" />);
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();
  });

  it('renders Concluído for concluido status', () => {
    render(<StatusBadge status="concluido" />);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('renders Finalizado for finalizado status', () => {
    render(<StatusBadge status="finalizado" />);
    expect(screen.getByText('Finalizado')).toBeInTheDocument();
  });

  it('renders Cancelado for cancelado status', () => {
    render(<StatusBadge status="cancelado" />);
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('renders raw status for unknown status', () => {
    render(<StatusBadge status="outro_status" />);
    expect(screen.getByText('outro_status')).toBeInTheDocument();
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
});
