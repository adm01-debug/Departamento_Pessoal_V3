import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { propsArcoDonut } from '../dashboard/arcoDonutMotion';
import { ANIMACAO_DONUT_CARD } from '../dashboard/donutMotion';

/**
 * TRAÇADO DAS ROSCAS — prova objetiva da fonte única.
 *
 * A rosca do card "Tipo de Vínculo" (Dashboard Executivo) e a rosca
 * "Distribuição de Status" (Controle de Ponto) precisam ter a MESMA animação
 * de entrada: o `strokeDasharray` desenhado progressivamente, um segmento
 * depois do outro. Antes, cada gráfico tinha o seu mecanismo — o Recharts
 * animava ângulos (todos os setores crescendo juntos) no Ponto, e o
 * `DonutChart` desenhava o arco no Dashboard.
 *
 * Este teste trava:
 *   1. a função `propsArcoDonut` (mecânica + preset `ANIMACAO_DONUT_CARD`);
 *   2. o fato de os DOIS componentes consumirem essa função — para divergirem,
 *      seria preciso reescrever um dos dois arquivos.
 */
const ler = (relativo: string) => readFileSync(path.resolve(process.cwd(), relativo), 'utf8');

describe('traçado progressivo das roscas (arcoDonutMotion)', () => {
  it('usa o preset ANIMACAO_DONUT_CARD: 1,8 s, 0,2 s de atraso, 0,15 s de passo', () => {
    expect(ANIMACAO_DONUT_CARD).toEqual({
      animationDuration: 1.8,
      animationDelay: 0.2,
      segmentStagger: 0.15,
      animationEase: 'easeOut',
    });

    expect(
      propsArcoDonut({
        indice: 0,
        comprimento: 240,
        dashArrayFinal: '180 240',
        emVista: true,
      })
    ).toEqual({
      initial: { strokeDasharray: '0 240' },
      animate: { strokeDasharray: '180 240' },
      transition: { duration: 1.8, delay: 0.2, ease: 'easeOut' },
    });
  });

  it('cada segmento parte 0,15 s depois do anterior (mesma cascata da referência)', () => {
    const terceiro = propsArcoDonut({
      indice: 2,
      comprimento: 240,
      dashArrayFinal: '60 240',
      emVista: true,
    });
    expect((terceiro.transition as { delay?: number }).delay).toBeCloseTo(0.2 + 2 * 0.15, 5);
  });

  it('antes de entrar em exibição o arco continua "nada desenhado"', () => {
    const antes = propsArcoDonut({
      indice: 1,
      comprimento: 100,
      dashArrayFinal: '100 100',
      emVista: false,
    });
    expect(antes.initial).toEqual({ strokeDasharray: '0 100' });
    expect(antes.animate).toEqual({ strokeDasharray: '0 100' });
  });

  it('movimento reduzido desenha o arco pronto, sem espera', () => {
    const reduzido = propsArcoDonut({
      indice: 3,
      comprimento: 100,
      dashArrayFinal: '100 100',
      emVista: true,
      reduzido: true,
    });
    expect(reduzido.transition).toEqual({ duration: 0, delay: 0, ease: 'easeOut' });
    expect(reduzido.animate).toEqual({ strokeDasharray: '100 100' });
  });

  it('quem chama pode trocar a régua sem tocar na mecânica', () => {
    const customizado = propsArcoDonut({
      indice: 0,
      comprimento: 100,
      dashArrayFinal: '50 100',
      emVista: true,
      duracao: 0.6,
      atraso: 0.1,
      passo: 0.05,
      curva: 'linear',
    });
    expect(customizado.transition).toEqual({ duration: 0.6, delay: 0.1, ease: 'linear' });
  });

  it('os DOIS gráficos usam a mesma mecânica (paridade por construção)', () => {
    // DonutChart: anel do "Tipo de Vínculo" e do "Departamentos".
    const donut = ler('src/components/dashboard/DonutChart.tsx');
    expect(donut).toContain("from './anelDonut'");
    expect(donut).toContain('<AnelDonut');
    expect(donut, 'DonutChart voltou a animar o dasharray por conta própria').not.toMatch(
      /initial=\{\{ strokeDasharray/
    );

    // O anel é quem consome a mecânica do traçado.
    const anel = ler('src/components/dashboard/anelDonut.tsx');
    expect(anel).toContain("from './arcoDonutMotion'");
    expect(anel).toContain('propsArcoDonut({');

    // Rosca do Controle de Ponto: mesmo anel, com o MESMO preset.
    const ponto = ler('src/components/ponto/GestaoPontoAnalytics.tsx');
    expect(ponto).toContain("from '@/components/dashboard/anelDonut'");
    expect(ponto).toContain('<AnelDonut');
    expect(ponto, 'rosca do Ponto voltou a animar por ângulo (Recharts)').not.toMatch(/animationDuration=\{/);
    // O `<Pie>` do Recharts fica só como sensor invisível (tooltip/hover).
    expect(ponto).toContain('fillOpacity={0}');
    expect(ponto).toContain('isAnimationActive={false}');

    // Barras: mesma mecânica do card "2. Visualize o impacto".
    expect(ponto).toContain("from '@/components/ui/crescimentoBarras'");
    expect(ponto).toContain('useCrescimentoBarras({');
    expect(ponto).toContain('estiloCrescimentoBarra(indice)');
    expect(ponto, 'barras voltaram a animar `height` pela régua de progresso').not.toContain('progressMotion');
  });
});
