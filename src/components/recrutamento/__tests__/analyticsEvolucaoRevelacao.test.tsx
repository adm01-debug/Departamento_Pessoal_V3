import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { criarCandidatura } from './candidatosFixture';

/**
 * Revelação das séries da "Evolução de candidaturas".
 *
 * O gráfico real é validado no navegador; aqui o Recharts é substituído por um
 * mock que GUARDA as props de cada série — é assim que o teste prova o que o
 * componente realmente liga no `<Area>` de candidaturas e no de contratações:
 * o mesmo clip de revelação nas duas, a animação nativa do Recharts desligada e
 * o clip começando escondido (largura 0) até a entrada do card terminar.
 */
const series: { props: Record<string, unknown> }[] = [];

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ComposedChart: ({ children }: { children: ReactNode }) => <svg>{children}</svg>,
  Area: (props: Record<string, unknown>) => {
    series.push({ props });
    return null;
  },
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  DefaultTooltipContent: () => null,
}));

import { AnalyticsEvolucao } from '../AnalyticsEvolucao';
import { CONFIG_REVELACAO_GRAFICO } from '@/components/ui/revelacaoGrafico';

const REFERENCIA = new Date('2026-08-20T12:00:00Z');

const CANDIDATURAS = [
  criarCandidatura({ id: 'cand-1', created_at: '2026-06-03T12:00:00Z', updated_at: '2026-06-03T12:00:00Z' }),
  criarCandidatura({
    id: 'cand-2',
    etapa: 'contratado',
    status: 'contratado',
    created_at: '2026-08-05T12:00:00Z',
    updated_at: '2026-08-05T12:00:00Z',
  }),
];

function renderizar() {
  return render(<AnalyticsEvolucao candidaturas={CANDIDATURAS} referencia={REFERENCIA} index={5} />);
}

describe('AnalyticsEvolucao — revelação das séries', () => {
  afterEach(() => {
    series.length = 0;
  });

  it('usa a régua compartilhada do gesto (a mesma do card "Visão Geral da Empresa")', () => {
    expect(CONFIG_REVELACAO_GRAFICO).toEqual({ duracaoSegundos: 2.5, curva: 'easeInOut' });
  });

  it('liga as DUAS séries ao MESMO clip e desliga a animação nativa do Recharts', () => {
    renderizar();

    expect(series).toHaveLength(2);
    const [candidaturas, contratacoes] = series;

    expect(candidaturas.props.dataKey).toBe('candidaturas');
    expect(contratacoes.props.dataKey).toBe('contratacoes');

    for (const serie of series) {
      expect(serie.props.isAnimationActive).toBe(false);
      expect(serie.props.clipPath).toBe('url(#recrutamento-evolucao-reveal-clip)');
    }

    // Candidaturas mantém o preenchimento em degradê; contratações vira área
    // SEM preenchimento (mesma curva aberta que o `<Line>` desenhava).
    expect(candidaturas.props.fill).toBe('url(#recrutamento-evolucao-fill)');
    expect(contratacoes.props.fill).toBe('none');
  });

  it('mantém as cores e os pontos das séries', () => {
    renderizar();

    expect(series[0].props.stroke).toBe('hsl(var(--info))');
    expect(series[1].props.stroke).toBe('hsl(var(--success))');
    expect(series[0].props.type).toBe('monotone');
    expect(series[1].props.type).toBe('monotone');
    expect(series[0].props.dot).toEqual({ r: 2, fill: 'hsl(var(--info))', strokeWidth: 0 });
    expect(series[1].props.dot).toEqual({ r: 2, fill: 'hsl(var(--success))', strokeWidth: 0 });
  });

  it('o clip existe no <defs> e começa escondido (largura 0) até a entrada do card terminar', () => {
    renderizar();

    const clip = document.querySelector('clipPath#recrutamento-evolucao-reveal-clip');
    expect(clip).not.toBeNull();

    const retangulo = clip?.querySelector('rect');
    expect(retangulo).not.toBeNull();
    expect(retangulo?.getAttribute('height')).toBe('100%');
    expect(retangulo?.getAttribute('width')).toMatch(/^0(px)?$/);
  });
});
