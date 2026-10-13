import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Prova OBJETIVA de que a entrada dos cards da Gestão de Desempenho é a MESMA
 * do Dashboard Executivo: o mock da Motion expõe os props recebidos
 * (`custom`/`variants`/`initial`/`animate`) em data-attributes, permitindo
 * comparar o keyframe `hidden` com o `cardVariants` de `MetricCard.tsx` e
 * conferir os índices da cascata.
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
import { cardVariants } from '@/components/dashboard/MetricCard';

const FEEDBACKS = [
  { id: '1', nota_geral: 5, status: 'concluido' },
  { id: '2', nota_geral: 3, status: 'pendente' },
];
const METAS = [{ id: 'm1', titulo: 'Meta A', valor_objetivo: 100, valor_atual: 75 }];
const CICLOS = [{ id: 'c1', nome: 'Ciclo 2026', status: 'ativo' }];

const REF_HIDDEN = JSON.stringify(cardVariants.hidden);

describe('entrada de cards da Gestão de Desempenho', () => {
  it('reutiliza exatamente o keyframe `hidden` do Dashboard Executivo (fade + y:20)', () => {
    expect(REF_HIDDEN).toBe('{"opacity":0,"y":20}');
  });

  it('os três cards analíticos entram em cascata a partir de `indiceBase` (2 na aba Ciclos)', () => {
    render(<AnaliticosDesempenho feedbacks={FEEDBACKS} metas={METAS} indiceBase={2} />);

    const cards = screen.getAllByTestId('entrada-card');
    expect(cards.map((e) => e.getAttribute('data-custom'))).toEqual(['2', '3', '4']);
    cards.forEach((el) => {
      expect(el.getAttribute('data-initial')).toBe('hidden');
      expect(el.getAttribute('data-animate')).toBe('visible');
      expect(el.getAttribute('data-hidden')).toBe(REF_HIDDEN);
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
