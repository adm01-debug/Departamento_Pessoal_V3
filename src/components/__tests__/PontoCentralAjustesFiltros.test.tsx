/**
 * Central de Ajustes — BARRA DE FILTROS (chips de status + período).
 *
 * O jsdom não pinta pixel, então o teste trava o CONTRATO do padrão adotado,
 * que é o mesmo das outras áreas do sistema:
 *
 *   • os quatro filtros são as pílulas do Design System (`ColoredFilterChip`),
 *     com bolinha colorida + rótulo + contador — e NENHUM ícone (os antigos
 *     lista/relógio/check/X saíram);
 *   • cada chip usa a família de cor do seu status (lime, âmbar, verde,
 *     vermelho), no repouso e no selecionado (glow temático);
 *   • os contadores vêm da prop `contagem` (dado real), não de constante;
 *   • a faixa não quebra linha: rola na horizontal em telas estreitas
 *     (`overflow-x-auto` + `no-scrollbar`) com 10 px entre os chips.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PALETAS_CHIP, TEMA_TODOS } from '@/components/avaliacao/chipFiltroComum';
import { ColoredFilterChip } from '@/components/avaliacao/ColoredFilterChip';
import { CentralAjustesFiltros } from '../ponto/CentralAjustesFiltros';
import type { ContagemAjustes, FiltroStatusAjuste } from '../ponto/centralAjustes';

const CONTAGEM: ContagemAjustes = { todos: 10, pendentes: 6, aprovadas: 3, rejeitadas: 1 };

/** Um caso por filtro: rótulo, valor de status, contador e família de cor. */
const CASOS = [
  { rotulo: 'Todos', valor: 'todos', total: 10, tema: TEMA_TODOS },
  { rotulo: 'Pendentes', valor: 'pendente', total: 6, tema: PALETAS_CHIP.amber },
  { rotulo: 'Aprovadas', valor: 'aprovado', total: 3, tema: PALETAS_CHIP.emerald },
  { rotulo: 'Rejeitadas', valor: 'rejeitado', total: 1, tema: PALETAS_CHIP.red },
] as const;

function montar(opcoes: { status?: FiltroStatusAjuste; onStatus?: (valor: FiltroStatusAjuste) => void } = {}) {
  return render(
    <CentralAjustesFiltros
      contagem={CONTAGEM}
      status={opcoes.status ?? 'todos'}
      onStatus={opcoes.onStatus ?? vi.fn()}
      periodo="30d"
      onPeriodo={vi.fn()}
    />
  );
}

/** A faixa dos chips (o grupo acessível), não a barra inteira. */
const faixa = () => screen.getByRole('group', { name: /filtrar solicitações por status/i });

describe('CentralAjustesFiltros — chips de status', () => {
  it('renderiza os quatro filtros como pílulas do Design System', () => {
    montar();

    expect(within(faixa()).getAllByRole('button')).toHaveLength(4);

    CASOS.forEach(({ rotulo, total }) => {
      const botao = screen.getByRole('button', { name: `${rotulo} (${total})` });
      // Anatomia da pílula: raio total, borda fina e altura do DS (32 px).
      expect(botao.className).toContain('rounded-full');
      expect(botao.className).toContain('border');
      expect(botao.className).toContain('h-8');
      expect(botao.className).toContain('px-3');
      // Texto do status e contador dentro do próprio chip.
      expect(within(botao).getByText(rotulo)).toBeInTheDocument();
      expect(within(botao).getByText(String(total))).toBeInTheDocument();
    });
  });

  it('não usa mais ícones — a leitura é a bolinha colorida', () => {
    montar();
    // Nenhum SVG dentro do grupo de filtros (os antigos ícones saíram).
    expect(faixa().querySelectorAll('svg')).toHaveLength(0);

    CASOS.forEach(({ rotulo, total }) => {
      const botao = screen.getByRole('button', { name: `${rotulo} (${total})` });
      const ponto = botao.querySelector('span[aria-hidden]');
      expect(ponto).not.toBeNull();
      expect(ponto?.className).toContain('rounded-full');
      expect(ponto?.className).toContain('h-1.5');
      expect(ponto?.className).toContain('w-1.5');
    });
  });

  it('pinta cada filtro com a cor do seu status (indicador, borda, fundo e texto)', () => {
    // "todos" é o status montado: ele é o único aceso, os outros três são repouso.
    montar({ status: 'todos' });

    CASOS.forEach(({ rotulo, total, tema, valor }) => {
      const ativo = valor === 'todos';
      const botao = screen.getByRole('button', { name: `${rotulo} (${total})` });
      const ponto = botao.querySelector('span[aria-hidden]') as HTMLElement;

      // A bolinha é sólida no MESMO tom do status, nos dois estados.
      expect(ponto.className).toContain(tema.ponto);
      expect(botao.className).toContain(ativo ? tema.bordaAtiva : tema.borda);
      expect(botao.className).toContain(ativo ? tema.fundoAtivo : tema.fundo);
      expect(botao.className).toContain(ativo ? tema.textoAtivo : tema.texto);
      // Transição suave do DS (200 ms) e respeito a `prefers-reduced-motion`.
      expect(botao.className).toContain('transition-all');
      expect(botao.className).toContain('duration-200');
      expect(botao.className).toContain('motion-reduce:transition-none');
    });
  });

  it('destaca o selecionado com a MESMA família + glow, sem alterar o tamanho', () => {
    montar({ status: 'pendente' });

    const pendentes = screen.getByRole('button', { name: 'Pendentes (6)' });
    const tema = PALETAS_CHIP.amber;
    expect(pendentes).toHaveAttribute('aria-pressed', 'true');
    expect(pendentes.className).toContain(tema.glow);
    expect(pendentes.className).toContain(tema.bordaAtiva);
    expect(pendentes.className).toContain(tema.fundoAtivo);
    expect(pendentes.className).toContain(tema.textoAtivo);
    // O repouso não sobrevive ao merge: o aceso é o tom mais forte da família.
    expect(pendentes.className).not.toContain(tema.fundo);
    // Hover não muda a caixa: a pílula é `h-8` nos dois estados.
    expect(pendentes.className).toContain('h-8');

    const todos = screen.getByRole('button', { name: 'Todos (10)' });
    expect(todos).toHaveAttribute('aria-pressed', 'false');
    expect(todos.className).not.toContain('shadow-glow');
  });

  it('clica no filtro e devolve o valor do status correspondente', () => {
    const onStatus = vi.fn();
    montar({ onStatus });

    CASOS.forEach(({ rotulo, total, valor }) => {
      fireEvent.click(screen.getByRole('button', { name: `${rotulo} (${total})` }));
      expect(onStatus).toHaveBeenLastCalledWith(valor);
    });
    expect(onStatus).toHaveBeenCalledTimes(CASOS.length);
  });

  it('usa os contadores reais recebidos (nada fixo no componente)', () => {
    const { rerender } = montar();
    expect(screen.getByRole('button', { name: 'Aprovadas (3)' })).toBeInTheDocument();

    rerender(
      <CentralAjustesFiltros
        contagem={{ todos: 4, pendentes: 0, aprovadas: 2, rejeitadas: 2 }}
        status="todos"
        onStatus={vi.fn()}
        periodo="hoje"
        onPeriodo={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Todos (4)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pendentes (0)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejeitadas (2)' })).toBeInTheDocument();
  });

  it('mantém os quatro numa linha, com rolagem horizontal em telas estreitas', () => {
    montar();
    const grupo = faixa();
    expect(grupo.className).toContain('flex');
    expect(grupo.className).toContain('gap-2');
    expect(grupo.className).toContain('overflow-x-auto');
    expect(grupo.className).toContain('no-scrollbar');
    // Nenhum `flex-wrap`: os filtros nunca viram duas linhas.
    expect(grupo.className).not.toContain('flex-wrap');
  });

  it('preserva o seletor de período ao lado dos chips', () => {
    montar();
    expect(screen.getByRole('combobox', { name: /período das solicitações/i })).toBeInTheDocument();
  });
});

describe('ColoredFilterChip — o componente reusado', () => {
  it('é a pílula única do Design System (rótulo + contador + tema, sem ícone)', () => {
    const { container } = render(
      <ColoredFilterChip label="Pendentes" count={6} tema={PALETAS_CHIP.amber} selected={false} onClick={vi.fn()} />
    );
    const botao = container.querySelector('button') as HTMLElement;
    expect(botao.className).toContain('rounded-full');
    expect(botao.className).toContain('h-8');
    expect(botao.querySelectorAll('svg')).toHaveLength(0);
  });
});
