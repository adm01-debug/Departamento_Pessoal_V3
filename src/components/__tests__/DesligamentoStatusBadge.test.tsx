import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
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

  // Os seis valores REAIS do enum `tipo_desligamento` do banco canonico
  // (conferidos por supabase_db_list_enums). Antes desta correcao o mapa usava
  // `com_justa_causa`, `acordo_mutuo` e `termino_contrato` — que nao existem — e
  // nao tinha `falecimento`: quatro dos seis tipos exibiam o valor cru na tela.
  it.each([
    ['sem_justa_causa', 'Sem Justa Causa'],
    ['justa_causa', 'Justa Causa'],
    ['pedido_demissao', 'Pedido Demissão'],
    ['acordo', 'Acordo'],
    ['fim_contrato', 'Fim de Contrato'],
    ['falecimento', 'Falecimento'],
  ])('traduz o tipo real %s', (tipo, rotulo) => {
    render(<TipoBadge tipo={tipo} />);
    expect(screen.getByText(rotulo)).toBeInTheDocument();
  });

  // Fecha a porta de volta: se alguem reintroduzir as chaves inventadas, elas
  // aparecem cruas na tela — e este caso denuncia.
  it.each(['com_justa_causa', 'acordo_mutuo', 'termino_contrato'])(
    'nao reconhece a chave inexistente %s (cai no valor cru)',
    (tipo) => {
      render(<TipoBadge tipo={tipo} />);
      expect(screen.getByText(tipo)).toBeInTheDocument();
    }
  );

  it('status pago tem rotulo proprio (a producao grava esse valor)', () => {
    render(<StatusBadge status="pago" />);
    expect(screen.getByText('Pago')).toBeInTheDocument();
  });
});
