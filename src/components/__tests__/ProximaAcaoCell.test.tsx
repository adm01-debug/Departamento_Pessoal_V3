import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProximaAcaoCell } from '../desligamentos/ProximaAcaoCell';
import type { DesligamentoLike } from '../desligamentos/desligamentosDerivacoes';

/**
 * O que este arquivo trava: o prazo do art. 477 §6º (data do desligamento + 10
 * dias) chegando à TELA. `proximaAcaoDesligamento` já existia em
 * `desligamentosDerivacoes.ts:183`, com teste próprio, e era chamada só pelo
 * próprio teste — nenhuma tela a consumia.
 */
const HOJE = new Date(2026, 9, 15); // 15/10/2026, local
const hojeMs = HOJE.getTime();

function desligamento(over: Partial<DesligamentoLike> = {}): DesligamentoLike {
  return { id: 'd1', tipo: 'sem_justa_causa', status: 'pendente', etapa: 'calculo', ...over };
}

describe('ProximaAcaoCell', () => {
  it('prazo vencido aparece como atraso, em vermelho', () => {
    // 01/09 + 10 dias = 11/09 → 34 dias de atraso em 15/10.
    const { container } = render(
      <ProximaAcaoCell desligamento={desligamento({ data_desligamento: '2026-09-01' })} hojeMs={hojeMs} />
    );
    expect(screen.getByText(/Atrasado há 34 dias/)).toBeInTheDocument();
    expect(container.querySelector('.text-destructive')).not.toBeNull();
  });

  it('prazo vencendo hoje aparece como "Hoje", em amarelo', () => {
    // 05/10 + 10 dias = 15/10.
    const { container } = render(
      <ProximaAcaoCell desligamento={desligamento({ data_desligamento: '2026-10-05' })} hojeMs={hojeMs} />
    );
    expect(screen.getByText('Hoje')).toBeInTheDocument();
    expect(container.querySelector('.text-warning')).not.toBeNull();
  });

  it('prazo folgado não alarma: tom neutro', () => {
    const { container } = render(
      <ProximaAcaoCell desligamento={desligamento({ data_desligamento: '2026-10-14' })} hojeMs={hojeMs} />
    );
    expect(container.querySelector('.text-destructive')).toBeNull();
    expect(container.querySelector('.text-warning')).toBeNull();
  });

  it('processo concluído não mostra prazo nenhum', () => {
    render(
      <ProximaAcaoCell
        desligamento={desligamento({ data_desligamento: '2026-09-01', status: 'pago' })}
        hojeMs={hojeMs}
      />
    );
    expect(screen.getByText('Processo concluído')).toBeInTheDocument();
    // o prazo venceu, mas não há mais nada a fazer: alarme aqui seria ruído
    expect(screen.queryByText(/Atrasado/)).toBeNull();
  });

  it('processo cancelado também não mostra prazo', () => {
    render(
      <ProximaAcaoCell
        desligamento={desligamento({ data_desligamento: '2026-09-01', status: 'cancelado' })}
        hojeMs={hojeMs}
      />
    );
    expect(screen.getByText('Processo cancelado')).toBeInTheDocument();
    expect(screen.queryByText(/Atrasado/)).toBeNull();
  });

  it('sem data de desligamento mostra a ação, sem inventar prazo', () => {
    render(<ProximaAcaoCell desligamento={desligamento({ data_desligamento: null })} hojeMs={hojeMs} />);
    expect(screen.queryByText(/Atrasado|Hoje|Prazo:|Em \d+ dias/)).toBeNull();
  });
});
