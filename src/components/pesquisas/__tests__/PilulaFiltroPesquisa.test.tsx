/**
 * ============================================================================
 * PÍLULA DE FILTRO POR STATUS — contrato visual da limpeza pedida na tela de
 * Pesquisas de Clima & eNPS:
 *   • SEM bolinha colorida (o `ColoredFilterChip` do módulo de Desempenho tem a
 *     bolinha; esta pílula é local justamente para não ter);
 *   • rótulo centralizado + contador (badge) na extremidade DIREITA;
 *   • cores preservadas: o tema tinge repouso, hover e estado selecionado.
 *
 * O teste trava a ESTRUTURA (2 spans, nenhum decorativo) — se alguém reintroduzir
 * o ponto, a primeira asserção quebra.
 * ============================================================================
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PALETAS_CHIP, TEMA_TODOS } from '@/components/avaliacao/chipFiltroComum';
import { PilulaFiltroPesquisa } from '../PilulaFiltroPesquisa';

describe('PilulaFiltroPesquisa', () => {
  it('não renderiza nenhum elemento decorativo (bolinha) — só rótulo e badge', () => {
    const { container } = render(
      <PilulaFiltroPesquisa label="Ativas" count={2} tema={PALETAS_CHIP.emerald} selected={false} onClick={() => {}} />
    );

    const pilula = container.querySelector('button')!;
    // Dois e SÓ dois filhos: texto + contador. Nada de `span[aria-hidden]`.
    expect(pilula.querySelectorAll('span')).toHaveLength(2);
    expect(pilula.querySelector('span[aria-hidden]')).toBeNull();
    expect(pilula.querySelector('.rounded-full.h-1\\.5')).toBeNull();
  });

  it('centraliza o rótulo e ancora o badge na direita', () => {
    render(<PilulaFiltroPesquisa label="Encerradas" count={1} tema={PALETAS_CHIP.blue} selected={false} onClick={() => {}} />);

    const pilula = screen.getByRole('button', { name: /Encerradas/i });
    expect(pilula).toHaveClass('justify-center', 'items-center', 'rounded-full', 'h-9', 'w-full');

    // Rótulo é o 1º span (centralizado pelo `justify-center` do botão);
    // o contador é o 2º e usa posicionamento absoluto na ponta direita.
    const rotulo = screen.getByText('Encerradas');
    const badge = screen.getByText('1');
    expect(rotulo.tagName).toBe('SPAN');
    expect(badge).toHaveClass('absolute', 'right-2', 'tabular-nums');
  });

  it('mantém o texto do rótulo e a contagem recebida', () => {
    render(<PilulaFiltroPesquisa label="Rascunhos" count={2} tema={PALETAS_CHIP.amber} selected={false} onClick={() => {}} />);

    expect(screen.getByText('Rascunhos')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('aplica o tema no repouso e troca para o tom ativo quando selecionada', () => {
    const { rerender } = render(
      <PilulaFiltroPesquisa label="Todas" count={5} tema={TEMA_TODOS} selected={false} onClick={() => {}} />
    );

    const pilula = screen.getByRole('button', { name: /Todas/i });
    const badge = screen.getByText('5');

    // Repouso
    expect(pilula).toHaveClass('bg-primary/10', 'border-primary/25', 'text-primary/90');
    expect(pilula).not.toHaveClass('shadow-glow');
    expect(badge).toHaveClass('bg-primary/15');

    // Selecionada — MESMA família, mais contraste + glow
    rerender(<PilulaFiltroPesquisa label="Todas" count={5} tema={TEMA_TODOS} selected onClick={() => {}} />);
    expect(pilula).toHaveClass('bg-primary/20', 'border-primary/60', 'text-primary', 'shadow-glow');
    expect(pilula).not.toHaveClass('bg-primary/10');
    expect(badge).toHaveClass('bg-primary/25');
  });

  it('expõe o estado por aria-pressed e dispara o clique', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <PilulaFiltroPesquisa label="Todas" count={5} tema={TEMA_TODOS} selected onClick={onClick} />
    );

    const pilula = screen.getByRole('button', { name: /Todas/i });
    expect(pilula).toHaveAttribute('aria-pressed', 'true');
    expect(pilula).toHaveAttribute('type', 'button');

    fireEvent.click(pilula);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<PilulaFiltroPesquisa label="Todas" count={5} tema={TEMA_TODOS} selected={false} onClick={onClick} />);
    expect(screen.getByRole('button', { name: /Todas/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('usa o aria-label descritivo quando informado', () => {
    render(
      <PilulaFiltroPesquisa
        label="Ativas"
        count={2}
        tema={PALETAS_CHIP.emerald}
        selected={false}
        onClick={() => {}}
        ariaLabel="Filtrar por Ativas: 2 pesquisa(s)"
      />
    );

    expect(screen.getByRole('button', { name: 'Filtrar por Ativas: 2 pesquisa(s)' })).toBeInTheDocument();
  });
});
