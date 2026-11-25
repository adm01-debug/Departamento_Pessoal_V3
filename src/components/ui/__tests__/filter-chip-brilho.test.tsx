import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilterChip, type TomChipBrilho } from '../filter-chip';

/**
 * CONTRATO VISUAL DO CHIP `brilho` (filtros rápidos da Jornada de Onboarding).
 *
 * O chip segue o MESMO tema dos filtros do Hub de Premiações
 * (`avaliacao/ColoredFilterChip` + `PALETAS_CHIP`), e isso vale para os DOIS
 * estados: o repouso já é COLORIDO (borda 25%, tinta 10%, texto 90%, pílula do
 * contador a 15%) e o selecionado sobe um degrau na mesma família (borda
 * 55-60%, tinta 20%, texto cheio) + o halo `shadow-glow*` do tema.
 *
 * Este arquivo já travou duas regressões reais:
 *  1. o chip aceso voltou a um casulo sem cor (só contorno cinza);
 *  2. o repouso ficou cinza — a faixa virava um bloco apagado com um único chip
 *     colorido, o oposto do Hub, onde todo filtro tem a sua cor.
 * Por isso as classes estão escritas aqui uma a uma: a próxima refatoração de
 * `cn`, de tema ou de `className` do chamador quebra o teste antes de quebrar a
 * tela.
 */
describe('FilterChip variante="brilho"', () => {
  const renderChip = (tom?: TomChipBrilho, ativo = true) =>
    render(<FilterChip label="Todos" total={13} ativo={ativo} tom={tom} variante="brilho" onClick={vi.fn()} />);

  /** Espelho de `TEMA_CHIP_BRILHO` — a MESMA régua para as quatro famílias. */
  type Familia = {
    tom: TomChipBrilho;
    /** Raiz das classes de cor (`bg-<cor>/…`, `border-<cor>/…`, `text-<cor>/…`). */
    cor: string;
    /** Texto no repouso (90%) e no aceso (cor cheia). */
    textoRepouso: string;
    textoAtivo: string;
    /** Borda do aceso (o repouso é sempre /25 ou /30). */
    bordaAtiva: string;
    /** Halo do aceso: token do tema (ou a régua `0 0 20px -5px` no neutro). */
    glow: string;
  };

  const FAMILIAS: Familia[] = [
    {
      tom: 'primary',
      cor: 'primary',
      textoRepouso: 'text-primary/90',
      textoAtivo: 'text-primary',
      bordaAtiva: 'border-primary/60',
      glow: 'shadow-glow',
    },
    {
      tom: 'warning',
      cor: 'warning',
      textoRepouso: 'text-warning/90',
      textoAtivo: 'text-warning',
      bordaAtiva: 'border-warning/55',
      glow: 'shadow-glow-warning',
    },
    {
      tom: 'destructive',
      cor: 'destructive-vivid',
      textoRepouso: 'text-destructive-vivid/90',
      textoAtivo: 'text-destructive-vivid',
      bordaAtiva: 'border-destructive-vivid/60',
      glow: 'shadow-glow-destructive',
    },
    {
      tom: 'neutro',
      cor: 'slate-500',
      textoRepouso: 'text-slate-300/90',
      textoAtivo: 'text-slate-300',
      bordaAtiva: 'border-slate-500/55',
      glow: 'shadow-[0_0_20px_-5px_rgba(148,163,184,0.4)]',
    },
  ];

  it.each(FAMILIAS)('$tom: o repouso é COLORIDO (borda 25-30%, tinta 10%, texto 90%)', (familia) => {
    renderChip(familia.tom, false);
    const classes = screen.getByRole('button', { name: /Todos\s*13/ }).className;

    // Tinta da família no estado de repouso — o defeito corrigido aqui era um
    // casulo `bg-muted`/`bg-card` sem nenhuma cor.
    expect(classes).toContain(`bg-${familia.cor}/10`);
    expect(classes).toMatch(new RegExp(`border-${familia.cor}/(25|30)`));
    expect(classes).toContain(familia.textoRepouso);
    // Contador também tingido (pílula de 15%), no lugar do texto cinza. A
    // pílula é um filho do chip, então as classes dela se conferem à parte.
    const badge = screen.getByText('13');
    expect(badge.className).toContain(`bg-${familia.cor}/15`);
    expect(badge.className).toContain(familia.textoRepouso);
    // Nunca o fundo neutro do sistema no chip `brilho`.
    expect(classes).not.toContain('bg-muted');
    expect(classes).not.toContain('bg-card');
    // Sem halo no repouso: o glow é a marca do filtro SELECIONADO.
    expect(classes).not.toContain(familia.glow);
  });

  it.each(FAMILIAS)('$tom: o aceso sobe um degrau na mesma família (tinta 20%) e acende o halo', (familia) => {
    renderChip(familia.tom);
    const classes = screen.getByRole('button', { name: /Todos\s*13/ }).className;

    expect(classes).toContain(`bg-${familia.cor}/20`);
    expect(classes).toContain(familia.bordaAtiva);
    expect(classes).toContain(familia.textoAtivo);
    // HALO do tema — é ele que faz o chip aceso brilhar como no Hub.
    expect(classes).toContain(familia.glow);
    // Pílula do contador um degrau acima (25%): o número fica em badge, então a
    // classe dela se confere no próprio filho.
    expect(screen.getByText('13').className).toContain(`bg-${familia.cor}/25`);
    // Nunca fundo neutro nem preenchimento opaco no aceso.
    expect(classes).not.toContain('bg-muted');
    expect(classes).not.toContain('bg-card');
    expect(classes).not.toContain('text-primary-foreground');
  });

  it('só o repouso carrega hover: no aceso o hover não pode apagar a cor acesa', () => {
    const { unmount } = renderChip('primary', false);
    const repouso = screen.getByRole('button', { name: /Todos/ }).className;
    expect(repouso).toContain('hover:bg-primary/15');
    expect(repouso).toContain('hover:border-primary/45');
    unmount();

    renderChip('primary', true);
    const aceso = screen.getByRole('button', { name: /Todos/ }).className;
    expect(aceso).not.toContain('hover:bg-primary/15');
    expect(aceso).not.toContain('hover:border-primary/45');
  });

  it('sem `tom` cai na família NEUTRA nos dois estados (nunca no lime da marca)', () => {
    const { unmount } = renderChip(undefined, false);
    const repouso = screen.getByRole('button', { name: /Todos/ }).className;
    expect(repouso).toContain('bg-slate-500/10');
    expect(repouso).not.toContain('bg-primary');
    unmount();

    renderChip(undefined, true);
    const aceso = screen.getByRole('button', { name: /Todos/ }).className;
    expect(aceso).toContain('bg-slate-500/20');
    expect(aceso).toContain('shadow-[0_0_20px_-5px_rgba(148,163,184,0.4)]');
    expect(aceso).not.toContain('bg-primary');
  });

  it('mostra só o número, sem parênteses — o nome acessível lê "Todos 13"', () => {
    renderChip('warning');
    const botao = screen.getByRole('button', { name: 'Todos 13' });
    // Nenhum parêntese no DOM: o contador é o número solto na pílula.
    expect(botao.textContent).not.toContain('(');
    expect(botao.textContent).not.toContain(')');
    // A pílula é o ÚNICO pedaço com fundo: o número fica dentro dela.
    const badge = screen.getByText('13');
    expect(badge.className).toContain('bg-warning/25');
    expect(badge.className).toContain('text-warning');
  });

  it('a bolinha é sólida nos dois estados (nunca em 50% de opacidade)', () => {
    const { unmount } = render(
      <FilterChip label="Em dia" total={1} ativo ponto="bg-primary" tom="primary" variante="brilho" onClick={vi.fn()} />
    );
    const pontoAtivo = screen.getByRole('button', { name: /Em dia/ }).querySelector('span');
    expect(pontoAtivo?.className).toContain('bg-primary');
    expect(pontoAtivo?.className).not.toContain('opacity-50');
    unmount();

    render(
      <FilterChip
        label="Em dia"
        total={1}
        ativo={false}
        ponto="bg-primary"
        tom="primary"
        variante="brilho"
        onClick={vi.fn()}
      />
    );
    const pontoInativo = screen.getByRole('button', { name: /Em dia/ }).querySelector('span');
    expect(pontoInativo?.className).toContain('bg-primary');
    expect(pontoInativo?.className).not.toContain('opacity-50');
  });
});
