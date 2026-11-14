import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Prova OBJETIVA de duas coisas:
 *
 * 1. A barra de progresso do módulo usa EXATAMENTE a régua de "Amplitude de
 *    Liderança": duração 0,6s, `easeOut`, atraso `0,15 + índice × 0,1`.
 *    As constantes são a única fonte de verdade do ritmo nesta entrega (o
 *    card de referência vive no Dashboard Executivo, onda posterior).
 * 2. A trilha do ciclo exibe o mock visual de layout (concluída / atual /
 *    pendente) e a barra do "Progresso geral" usa o mesmo padrão.
 *
 * O mock da Motion expõe os props recebidos em data-attributes (mesma técnica de
 * `DesempenhoEntradaCascade.test.tsx`).
 */
vi.mock('framer-motion', () => {
  const capturar =
    (Tag: any) =>
    ({ children, initial, animate, transition, style, ...rest }: any) => (
      <Tag
        data-initial={JSON.stringify(initial)}
        data-animate={JSON.stringify(animate)}
        data-transition={JSON.stringify(transition)}
        style={style}
        {...rest}
      >
        {children}
      </Tag>
    );
  return {
    motion: {
      div: capturar('div'),
      span: capturar('span'),
      section: capturar('section'),
      p: capturar('p'),
      tr: capturar('tr'),
      create:
        (Component: any) =>
        ({ children, custom, variants, initial, animate, ...rest }: any) => <Component {...rest}>{children}</Component>,
    },
    AnimatePresence: ({ children }: any) => children,
    useReducedMotion: () => false,
    useInView: () => true,
  };
});

import {
  BARRA_ATRASO_POR_INDICE_S,
  BARRA_ATRASO_S,
  BARRA_DURACAO_S,
  BARRA_EASE,
  propsBarraProgresso,
} from '../avaliacao/barraProgressoAnim';
import { BarraProgresso } from '../avaliacao/barraProgresso';
import { CicloAtivoPanel } from '../avaliacao/CicloAtivoPanel';

describe('barra de progresso — paridade com "Amplitude de Liderança"', () => {
  it('a régua do módulo é, número por número, a do card de referência', () => {
    // O card "Amplitude de Liderança" (Dashboard Executivo, onda posterior)
    // anima: duration 0.6s, delay 0.15 + índice × 0.1, ease 'easeOut'.
    expect(BARRA_DURACAO_S).toBe(0.6);
    expect(BARRA_ATRASO_S).toBe(0.15);
    expect(BARRA_ATRASO_POR_INDICE_S).toBe(0.1);
    expect(BARRA_EASE).toBe('easeOut');

    // Par width 0 → pct% e pente por índice.
    expect(propsBarraProgresso(75, 0)).toMatchObject({
      initial: { width: 0 },
      animate: { width: '75%' },
    });
    expect((propsBarraProgresso(75, 3).transition as any).delay).toBeCloseTo(0.45, 5);
  });

  it('props da barra: 0 → pct%, com o stagger por índice', () => {
    expect(propsBarraProgresso(75, 0)).toEqual({
      initial: { width: 0 },
      animate: { width: '75%' },
      transition: { duration: 0.6, delay: 0.15, ease: 'easeOut' },
    });
    expect((propsBarraProgresso(30, 3) as any).transition.delay).toBeCloseTo(0.45, 5);
  });

  it('normaliza o percentual (limites 0–100 e valor inválido)', () => {
    expect((propsBarraProgresso(140) as any).animate).toEqual({ width: '100%' });
    expect((propsBarraProgresso(-20) as any).animate).toEqual({ width: '0%' });
    expect((propsBarraProgresso(Number.NaN) as any).animate).toEqual({ width: '0%' });
  });

  it('com movimento reduzido nasce cheia, sem transição', () => {
    expect(propsBarraProgresso(62, 1, true)).toEqual({ style: { width: '62%' } });
  });

  it('renderiza trilho arredondado + preenchimento em degradê', () => {
    const { container } = render(
      <BarraProgresso
        percentual={63}
        indice={2}
        cor="bg-gradient-to-r from-primary/70 to-primary"
        trilhoClassName="h-1.5 w-full bg-secondary"
      />
    );
    const trilho = container.querySelector('[class*="overflow-hidden"]') as HTMLElement;
    expect(trilho.className).toContain('rounded-full');
    expect(trilho.className).toContain('h-1.5');

    const preenchimento = container.querySelector('[data-animate]') as HTMLElement;
    expect(preenchimento.getAttribute('data-animate')).toBe('{"width":"63%"}');
    expect(preenchimento.getAttribute('data-transition')).toBe('{"duration":0.6,"delay":0.35,"ease":"easeOut"}');
    expect(preenchimento.className).toContain('from-primary/70');
  });
});

describe('trilha do ciclo — mock visual de layout', () => {
  const montar = () =>
    render(
      <CicloAtivoPanel
        ciclo={{ nome: 'Ciclo S2 2026', tipo: 'semestral', status: 'ativo' }}
        progresso={63}
        contadores={{ concluidas: 0, emAndamento: 7, atrasadas: 0 }}
      />
    );

  it('mostra as cinco etapas, sem dado faltando', () => {
    montar();
    ['Planejamento', 'Avaliações', 'Feedbacks', 'Calibração', 'Encerramento'].forEach((rotulo) => {
      expect(screen.getByText(rotulo)).toBeTruthy();
    });
  });

  it('Planejamento e Avaliações concluídas, Feedbacks atual, duas pendentes', () => {
    const { container } = montar();
    // Concluídas: círculo success com check.
    expect(container.querySelectorAll('.lucide-check')).toHaveLength(2);
    // Atual: círculo lime com halo.
    expect(container.querySelectorAll('[class*="ring-primary/20"]')).toHaveLength(1);
    // Pendentes: aro neutro.
    expect(container.querySelectorAll('[class*="border-muted-foreground/40"]')).toHaveLength(2);
    // Selo abaixo da etapa atual.
    expect(screen.getAllByText('Atual')).toHaveLength(1);
  });

  it('a linha é colorida até a etapa atual (verde antes, lime na entrada)', () => {
    const { container } = montar();
    const trechos = [...container.querySelectorAll('[class*="transition-colors"]')];
    expect(trechos).toHaveLength(2);
    expect(trechos[0].className).toContain('bg-success');
    expect(trechos[1].className).toContain('bg-primary');
  });

  it('o "Progresso geral" usa a barra padronizada (mesma régua, mesmo degradê)', () => {
    const { container } = montar();
    const barra = [...container.querySelectorAll('[data-animate]')].find(
      (el) => el.getAttribute('data-animate') === '{"width":"63%"}'
    ) as HTMLElement;
    expect(barra).toBeTruthy();
    expect(barra.getAttribute('data-transition')).toBe('{"duration":0.6,"delay":0.15,"ease":"easeOut"}');
    // 63% cai na faixa média da escala do módulo (lime profundo → lime).
    expect(barra.className).toContain('from-primary/70');
    expect(barra.className).toContain('rounded-full');
  });
});
