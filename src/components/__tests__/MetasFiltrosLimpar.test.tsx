import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetasFiltros } from '@/components/avaliacao/MetasFiltros';
import type { ContagemMetas, CriterioOrdem, FiltroStatus } from '@/components/avaliacao/metasComum';

/**
 * Prova da EXIBIÇÃO CONDICIONAL do botão "Limpar filtros" da aba "Metas & OKRs".
 *
 * A visibilidade é derivada dos PRÓPRIOS props (`temFiltroAtivo`), então cada
 * caso é um render com um filtro ativo — sem depender de dados, de Supabase ou
 * da ordem de cliques na UI. Cobre também a regra de que a ORDENAÇÃO isolada
 * NÃO conta como filtro ativo e que a busca só com espaços não acende o botão.
 */

const CONTAGEM: ContagemMetas = { todas: 6, emdia: 2, risco: 3, atrasada: 1, concluida: 0 };

/** Props no estado PADRÃO (nenhum filtro ativo) + overrides por caso. */
function propsPadrao(extra: Record<string, unknown> = {}) {
  return {
    busca: '',
    onBusca: vi.fn(),
    tipo: '',
    onTipo: vi.fn(),
    tipos: ['individual', 'empresa'],
    responsavel: '',
    onResponsavel: vi.fn(),
    responsaveis: ['Ana Souza', 'Bruno Lima'],
    cicloId: '',
    onCicloId: vi.fn(),
    ciclos: [{ id: 'c1', nome: 'Ciclo S1 2026' }],
    ordem: 'criticos' as CriterioOrdem,
    onOrdem: vi.fn(),
    status: 'todas' as FiltroStatus,
    onStatus: vi.fn(),
    contagem: CONTAGEM,
    filtrosAtivos: 0,
    onLimpar: vi.fn(),
    ...extra,
  } as React.ComponentProps<typeof MetasFiltros>;
}

/** O botão da BARRA (o do estado vazio tem o mesmo rótulo e não é este). */
const botaoLimpar = () => screen.queryByRole('button', { name: 'Limpar filtros' });

describe('MetasFiltros — botão "Limpar filtros"', () => {
  it('fica OCULTO quando nenhum filtro está ativo', () => {
    render(<MetasFiltros {...propsPadrao()} />);
    expect(botaoLimpar()).toBeNull();
  });

  it('fica OCULTO quando só a ORDENAÇÃO foi alterada (ordenar não é filtrar)', () => {
    render(<MetasFiltros {...propsPadrao({ ordem: 'maior_progresso' })} />);
    expect(botaoLimpar()).toBeNull();
  });

  it('fica OCULTO quando a busca só tem espaços', () => {
    render(<MetasFiltros {...propsPadrao({ busca: '   ' })} />);
    expect(botaoLimpar()).toBeNull();
  });

  it.each<[string, Record<string, unknown>]>([
    ['busca preenchida', { busca: 'turnover' }],
    ['Tipo selecionado (Empresa)', { tipo: 'empresa' }],
    ['Responsável selecionado', { responsavel: 'Ana Souza' }],
    ['filtro avançado (Ciclo)', { cicloId: 'c1' }],
    ['categoria rápida Em risco', { status: 'risco' }],
    ['categoria rápida Atrasadas', { status: 'atrasada' }],
  ])('fica VISÍVEL com %s', (_rotulo, patch) => {
    render(<MetasFiltros {...propsPadrao(patch)} />);
    expect(botaoLimpar()).not.toBeNull();
  });

  it('fica VISÍVEL com vários filtros combinados', () => {
    render(<MetasFiltros {...propsPadrao({ busca: 'a', tipo: 'empresa', responsavel: 'Ana Souza', status: 'risco' })} />);
    expect(botaoLimpar()).not.toBeNull();
  });

  it('SOME quando os filtros voltam ao padrão (re-render)', () => {
    const { rerender } = render(<MetasFiltros {...propsPadrao({ status: 'risco' })} />);
    expect(botaoLimpar()).not.toBeNull();
    rerender(<MetasFiltros {...propsPadrao()} />);
    expect(botaoLimpar()).toBeNull();
  });

  it('aciona `onLimpar` exatamente uma vez ao ser clicado', async () => {
    const onLimpar = vi.fn();
    render(<MetasFiltros {...propsPadrao({ busca: 'x', onLimpar })} />);
    await userEvent.click(botaoLimpar()!);
    expect(onLimpar).toHaveBeenCalledTimes(1);
  });

  it('vem logo depois de "Mais filtros", na mesma linha dos controles', () => {
    render(<MetasFiltros {...propsPadrao({ tipo: 'empresa' })} />);
    const mais = screen.getByRole('button', { name: /Mais filtros/ });
    const limpar = botaoLimpar()!;
    expect(limpar.parentElement).toBe(mais.parentElement);
    const irmaos = [...limpar.parentElement!.children];
    expect(irmaos.indexOf(limpar)).toBe(irmaos.indexOf(mais) + 1);
  });
});
