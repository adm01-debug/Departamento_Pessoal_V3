import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ElementType, ReactNode } from 'react';

/**
 * Regressão do item 13 da #571: o donut "Feedbacks por Status" deve tratar
 * `cancelado` como categoria própria — NUNCA somar feedbacks cancelados no
 * total de "Pendentes". Cenário do bug: um ciclo com feedbacks `cancelado`
 * que, antes do fix, inchavam a métrica "Pendentes".
 */
vi.mock('framer-motion', () => {
  type Children = { children?: ReactNode };
  const stub =
    (Tag: ElementType) =>
    ({ children, ...rest }: Record<string, unknown> & Children) => <Tag {...rest}>{children}</Tag>;
  return {
    motion: {
      div: stub('div'),
      section: stub('section'),
      span: stub('span'),
      p: stub('p'),
      tr: stub('tr'),
      create: (Component: ElementType) => (props: Record<string, unknown>) => <Component {...props} />,
    },
    AnimatePresence: ({ children }: Children) => children,
    useReducedMotion: () => false,
    useInView: () => true,
  };
});

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
}));

// A fonte do movimento no app é `@/lib/motionMode`, não hook do Framer.
vi.mock('@/lib/motionMode', () => ({ useMovimentoReduzido: () => false }));

import { AnaliticosDesempenho } from '../avaliacao/AnaliticosDesempenho';

describe('CardFeedbacksPorStatus – contagem por status (item 13 da #571)', () => {
  // Linha de legenda: rótulo + valor ficam no mesmo contêiner flexível.
  const valorDaLinha = (rotulo: string): string | undefined => {
    const label = screen.getByText(rotulo);
    const linha = label.closest('div.flex');
    return linha?.textContent?.replace(rotulo, '').replace(/%/g, '').trim();
  };

  it('não soma feedbacks `cancelado` em "Pendentes"', () => {
    render(
      <AnaliticosDesempenho
        feedbacks={[
          { id: '1', nota_geral: 5, status: 'concluido' },
          { id: '2', nota_geral: 3, status: 'cancelado' },
          { id: '3', nota_geral: 4, status: 'cancelado' },
          { id: '4', nota_geral: 2, status: 'pendente' },
        ]}
        metas={[]}
      />
    );

    expect(valorDaLinha('Concluídos')).toContain('1');
    // Pre-Fix, "Pendentes" valia 3 (1 real `pendente` + 2 `cancelado`).
    expect(valorDaLinha('Pendentes')).toContain('1');
    expect(valorDaLinha('Cancelados')).toContain('2');
    // A soma das três categorias fecha o Total (donut não tem "buraco").
    expect(valorDaLinha('Total')).toContain('4');
  });

  it('com todos os feedbacks cancelados, mostra só Cancelados e zero no resto', () => {
    render(
      <AnaliticosDesempenho
        feedbacks={[
          { id: '1', nota_geral: 5, status: 'cancelado' },
          { id: '2', nota_geral: 3, status: 'cancelado' },
        ]}
        metas={[]}
      />
    );

    expect(valorDaLinha('Concluídos')).toContain('0');
    expect(valorDaLinha('Pendentes')).toContain('0');
    expect(valorDaLinha('Cancelados')).toContain('2');
    expect(valorDaLinha('Total')).toContain('2');
  });
});
