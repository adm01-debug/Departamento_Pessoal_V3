import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * CICLO DE VIDA do card "Departamentos" (Dashboard principal) — o mesmo padrão
 * usado pelo card "Tipo de Vínculo" / "Mapa da Estrutura" (aba Estrutura do
 * Dashboard Executivo): RENDERIZAÇÃO CONDICIONAL ESTRITA.
 *
 * O que este teste trava:
 *   1. enquanto `isLoading` o gráfico e as legendas NÃO EXISTEM no DOM;
 *   2. no render em que os dados chegam eles são MONTADOS do zero (o `initial`
 *      do arco é "nada desenhado" e o das linhas é `x: -20px`), ou seja, a
 *      montagem é o gatilho — nada é consumido antes;
 *   3. a régua não muda: arco com `ANIMACAO_DONUT_CARD` (1,8 s / 0,2 s / 0,15 s)
 *      e legendas com 0,4 s em cascata de 0,5 s + 0,15 s por linha.
 */

/** Props capturadas de cada elemento animado (na ordem de montagem). */
const capturas = vi.hoisted(() => [] as { tag: string; initial: any; animate: any; transition: any }[]);

vi.mock('framer-motion', () => {
  const criar = (tag: 'div' | 'li' | 'circle') => {
    const Comp = ({ initial, animate, transition, children, ...rest }: any) => {
      capturas.push({ tag, initial, animate, transition });
      const Tag = tag as any;
      return <Tag {...rest}>{children}</Tag>;
    };
    Comp.displayName = `motion.${tag}`;
    return Comp;
  };

  return {
    motion: {
      div: criar('div'),
      li: criar('li'),
      circle: criar('circle'),
      // `analytics/widgets.tsx` faz `motion.create(Card)` (MotionCard).
      create: (Comp: any) => Comp,
    },
    // O gráfico desenha quando está na viewport; aqui ele sempre "está".
    useInView: () => true,
    useReducedMotion: () => false,
  };
});

import { DepartmentsCard } from '../dashboard/DepartmentsCard';

const LISTA = [
  { nome: 'Comercial', count: 6 },
  { nome: 'Operações', count: 4 },
];

/** Função utilitária: props capturadas de um tipo de elemento animado. */
function propsDe(tag: string) {
  return capturas.filter((c) => c.tag === tag);
}

describe('DepartmentsCard — ciclo de vida (renderização condicional estrita)', () => {
  beforeEach(() => {
    capturas.length = 0;
  });

  it('enquanto isLoading não monta gráfico nem legendas (só o skeleton)', () => {
    const { container } = render(<DepartmentsCard departamentos={LISTA} isLoading />);

    // O `<circle>` do arco só existe dentro do `DonutChart` (o ícone do
    // cabeçalho é um `<svg>` de lucide, com `<path>` — não conta).
    expect(container.querySelector('circle')).toBeNull();
    expect(screen.queryByText('Comercial')).toBeNull();
    expect(propsDe('circle')).toHaveLength(0);
    expect(propsDe('li')).toHaveLength(0);
    // O cabeçalho (estático) continua na tela durante o loading.
    expect(screen.getByText('Departamentos')).toBeInTheDocument();
  });

  it('monta o gráfico e as legendas somente quando isLoading vira false', () => {
    const { container, rerender } = render(<DepartmentsCard departamentos={LISTA} isLoading />);
    expect(container.querySelector('circle')).toBeNull();
    expect(screen.queryByText('Comercial')).toBeNull();

    rerender(<DepartmentsCard departamentos={LISTA} isLoading={false} />);

    expect(container.querySelector('circle')).toBeInTheDocument();
    expect(screen.getByText('Comercial')).toBeInTheDocument();
    expect(screen.getByText('Operações')).toBeInTheDocument();
  });

  it('monta o arco do zero ("nada desenhado") com a régua de 1,8 s', () => {
    render(<DepartmentsCard departamentos={LISTA} isLoading={false} />);

    const arcos = propsDe('circle');
    expect(arcos).toHaveLength(LISTA.length);

    arcos.forEach((arco, i) => {
      expect(String(arco.initial.strokeDasharray).startsWith('0 ')).toBe(true);
      expect(arco.animate.strokeDasharray).not.toBe(arco.initial.strokeDasharray);
      expect(arco.transition.duration).toBe(1.8);
      expect(arco.transition.delay).toBeCloseTo(0.2 + i * 0.15, 5);
      expect(arco.transition.ease).toBe('easeOut');
    });
  });

  it('monta as legendas em cascata (0,4 s, 0,5 s + 0,15 s por linha)', () => {
    render(<DepartmentsCard departamentos={LISTA} isLoading={false} />);

    const linhas = propsDe('li');
    expect(linhas).toHaveLength(LISTA.length);

    linhas.forEach((linha, i) => {
      expect(linha.initial).toMatchObject({ opacity: 0, x: -20 });
      expect(linha.animate).toMatchObject({ opacity: 1, x: 0 });
      expect(linha.transition.duration).toBe(0.4);
      expect(linha.transition.delay).toBeCloseTo(0.5 + i * 0.15, 5);
    });
  });

  it('lista vazia (fim do loading sem dados) mostra o estado vazio, sem gráfico', () => {
    const { container } = render(<DepartmentsCard departamentos={[]} isLoading={false} />);

    expect(container.querySelector('circle')).toBeNull();
    expect(screen.getByText('Nenhum departamento cadastrado')).toBeInTheDocument();
  });
});
