import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Prova OBJETIVA de que a entrada dos cards da Gestão de Desempenho usa a RÉGUA
 * GLOBAL do sistema — a mesma do Dashboard Executivo (fade + subida de 14 px,
 * 520 ms, 120 ms entre cards, `ease-out`) —, e não mais a régua local que a área
 * congelada fixava (20px / 0,4s / 0,08s). O mock da Motion expõe os props
 * recebidos (`custom`/`variants`/`initial`/`animate`) em data-attributes,
 * permitindo comparar o keyframe `hidden` com o `entradaCardGlobal` de
 * `ui/entradaGlobal.ts`, conferir os índices da cascata e o opt-out do CSS
 * (`data-entrada="cascata"`), que garante UMA animação por card.
 *
 * Padronização autorizada pelo usuário em 29/10/2026: "aplicar a mesma animação
 * de entrada do Dashboard Executivo a todos os cards e KPI cards do módulo
 * Avaliação e Performance".
 */
vi.mock('framer-motion', () => {
  const capturar = (Tag: any, ehCard: boolean) =>
    ({ children, custom, variants, initial, animate, ...rest }: any) => {
      const attrs = {
        'data-custom': String(custom),
        'data-initial': initial,
        'data-animate': animate,
        'data-hidden': JSON.stringify(variants?.hidden),
      };
      return ehCard ? (
        <Tag {...attrs} data-testid="entrada-card" {...rest}>{children}</Tag>
      ) : (
        <Tag {...attrs} {...rest}>{children}</Tag>
      );
    };
  return {
    motion: {
      div: capturar('div', false),
      section: capturar('section', true),
      span: capturar('span', false),
      p: capturar('p', false),
      tr: capturar('tr', false),
      create: (Component: any) =>
        ({ children, custom, variants, initial, animate, ...rest }: any) => (
          <div
            data-testid="entrada-card"
            data-custom={String(custom)}
            data-initial={initial}
            data-animate={animate}
            data-hidden={JSON.stringify(variants?.hidden)}
            data-entrada={rest['data-entrada']}
          >
            <Component {...rest}>{children}</Component>
          </div>
        ),
    },
    AnimatePresence: ({ children }: any) => children,
    // `ui/select` consome este hook; o mock parcial precisa expô-lo.
    useReducedMotion: () => false,
    // Revelação do donut / contador central do card "Feedbacks por Status".
    useInView: () => true,
  };
});

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
}));

import { AnaliticosDesempenho } from '../avaliacao/AnaliticosDesempenho';
import { TodosCiclosTable } from '../avaliacao/TodosCiclosTable';
import { MAX_ENTRADA_INDEX, entradaCard } from '../avaliacao/entradaCards';
import { CONFIG_ENTRADA_CARD_GLOBAL, atrasoEntradaCardGlobal, entradaCardGlobal } from '../ui/entradaGlobal';

const FEEDBACKS = [
  { id: '1', nota_geral: 5, status: 'concluido' },
  { id: '2', nota_geral: 3, status: 'pendente' },
];
const METAS = [{ id: 'm1', titulo: 'Meta A', valor_objetivo: 100, valor_atual: 75 }];
const CICLOS = [{ id: 'c1', nome: 'Ciclo 2026', status: 'ativo' }];

const REF_HIDDEN = JSON.stringify(entradaCardGlobal.hidden);

describe('entrada de cards da Gestão de Desempenho', () => {
  it('usa a régua global do sistema (fade + y:14) — nenhum número local', () => {
    expect(REF_HIDDEN).toBe('{"opacity":0,"y":14}');

    // MESMA variants do Dashboard Executivo: identidade de objeto, não cópia.
    expect(entradaCard(0).variants).toBe(entradaCardGlobal);
    expect(entradaCard(0).initial).toBe('hidden');
    expect(entradaCard(0).animate).toBe('visible');

    // Duração, intervalo e curva saem de `CONFIG_ENTRADA_CARD_GLOBAL`.
    const visivel = (entradaCardGlobal.visible as unknown as (p: number) => {
      transition: { duration: number; delay: number; ease: number[] };
    })(2);
    expect(visivel.transition.duration).toBe(CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs / 1000);
    expect(visivel.transition.delay).toBe(atrasoEntradaCardGlobal(2));
    expect(visivel.transition.ease).toEqual([...CONFIG_ENTRADA_CARD_GLOBAL.curva]);

    // Teto de índice preservado: do 9º card em diante o atraso para de crescer.
    expect(entradaCard(99).custom).toBe(MAX_ENTRADA_INDEX);
    expect(atrasoEntradaCardGlobal(MAX_ENTRADA_INDEX)).toBeCloseTo(0.96, 5);
  });

  it('os três cards analíticos entram em cascata a partir de `indiceBase` (2 na aba Ciclos)', () => {
    render(<AnaliticosDesempenho feedbacks={FEEDBACKS} metas={METAS} indiceBase={2} />);

    const cards = screen.getAllByTestId('entrada-card');
    expect(cards.map((e) => e.getAttribute('data-custom'))).toEqual(['2', '3', '4']);
    cards.forEach((el) => {
      expect(el.getAttribute('data-initial')).toBe('hidden');
      expect(el.getAttribute('data-animate')).toBe('visible');
      expect(el.getAttribute('data-hidden')).toBe(REF_HIDDEN);
      // Um card, uma animação: o CSS (`.animate-squash`) fica desligado.
      expect(el.getAttribute('data-entrada')).toBe('cascata');
    });
  });

  it('aba Ciclos: "Todos os Ciclos" entra no índice 5, depois dos analíticos', () => {
    render(
      <TodosCiclosTable
        ciclos={CICLOS}
        metas={METAS}
        onSelecionar={() => undefined}
        onExcluir={() => undefined}
        indice={5}
      />,
    );

    const secao = screen.getByTestId('entrada-card');
    expect(secao.getAttribute('data-custom')).toBe('5');
    expect(secao.getAttribute('data-hidden')).toBe(REF_HIDDEN);
  });
});
