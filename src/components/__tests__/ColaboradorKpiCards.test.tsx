import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ColaboradorKpiCards } from '@/components/colaboradores/ColaboradorKpiCards';

const OPCOES = [
  { value: 'ativo', label: 'Ativos' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'desligado', label: 'Desligados' },
];

function montar(props: Partial<React.ComponentProps<typeof ColaboradorKpiCards>> = {}) {
  const onToggle = vi.fn();
  render(
    <ColaboradorKpiCards
      statusOptions={OPCOES}
      activeStatus="all"
      onToggle={onToggle}
      summary={{ ativo: 30, pendente: 8, desligado: 2 }}
      isLoading={false}
      {...props}
    />
  );
  return { onToggle };
}

describe('ColaboradorKpiCards', () => {
  it('mostra um cartão por status, com a contagem do summary', () => {
    montar();
    for (const [rotulo, n] of [
      ['Ativos', '30'],
      ['Pendentes', '8'],
      ['Desligados', '2'],
    ]) {
      expect(screen.getByText(rotulo)).toBeInTheDocument();
      expect(screen.getByText(n)).toBeInTheDocument();
    }
  });

  it('repassa o status clicado para o onToggle', async () => {
    const { onToggle } = montar();
    await userEvent.click(screen.getByText('Pendentes'));
    expect(onToggle).toHaveBeenCalledWith('pendente');
  });

  // O toggle de volta para "all" é decisão da página (ela é dona do filtro), e
  // é por isso que o componente só informa qual foi clicado: aqui travamos que
  // ele NÃO decide sozinho — clicar no que já está ativo reporta o mesmo valor.
  it('ao clicar no status já ativo, reporta esse mesmo status e não decide o reset', async () => {
    const { onToggle } = montar({ activeStatus: 'ativo' });
    await userEvent.click(screen.getByText('Ativos'));
    expect(onToggle).toHaveBeenCalledWith('ativo');
  });

  it('sem summary e carregando, mostra esqueleto em vez de contagem zero', () => {
    montar({ summary: null, isLoading: true });
    expect(screen.queryByText('Ativos')).not.toBeInTheDocument();
  });

  it('com summary ausente e já carregado, mostra zero em vez de esqueleto', () => {
    montar({ summary: null, isLoading: false });
    expect(screen.getByText('Ativos')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });
});
