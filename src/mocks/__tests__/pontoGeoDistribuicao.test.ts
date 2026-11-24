import { describe, expect, it } from 'vitest';
import { DISTANCIAS_GEO_DEMO } from '../layoutMock/dados';
import { faixasDeDistancia, resumoGeo, type PontoGeografico } from '@/utils/pontoGeofencing';

/**
 * ============================================================================
 * VITRINE DO GEOFENCING — DISTRIBUIÇÃO POR DISTÂNCIA
 *
 * A série demonstrativa de `batidas_ponto` (`layoutMock/dados.ts`) alimenta
 * mapa, KPIs, conformidade, gráfico de faixas e tabela com as MESMAS linhas.
 * Este teste trava a calibragem aprovada da vitrine: 99 registros repartidos
 * em 48 / 27 / 14 / 7 / 3 pelas cinco faixas de 50 m de um raio de 200 m.
 * Se alguém voltar a concentrar tudo na primeira faixa (a fórmula antiga,
 * `12 + (seq % 40)`, deixava 95 dos 99 registros em 0–50 m), o gráfico volta a
 * nascer com uma coluna só e este teste avisa.
 * ============================================================================
 */
const PONTOS: PontoGeografico[] = DISTANCIAS_GEO_DEMO.map((distanciaMetros, indice) => ({
  id: `demo-${indice}`,
  colaboradorId: null,
  colaboradorNome: 'Colaborador',
  colaboradorFoto: null,
  data: null,
  hora: null,
  tipo: null,
  origem: null,
  latitude: 0,
  longitude: 0,
  distanciaMetros,
  dentroRaio: distanciaMetros <= 200,
}));

describe('layoutMock · distribuição por distância da vitrine', () => {
  it('tem 99 registros e cobre as cinco faixas de 50 m', () => {
    const faixas = faixasDeDistancia(PONTOS, 200);

    expect(faixas).toHaveLength(5);
    expect(faixas.map((faixa) => faixa.quantidade)).toEqual([48, 27, 14, 7, 3]);
    expect(faixas.reduce((soma, faixa) => soma + faixa.quantidade, 0)).toBe(99);
    expect(faixas.map((faixa) => faixa.rotulo)).toEqual([
      '0 – 50 m',
      '50 – 100 m',
      '100 – 150 m',
      '150 – 200 m',
      '> 200 m',
    ]);
  });

  it('coloca exatamente 3 registros além do raio de 200 m', () => {
    const resumo = resumoGeo(PONTOS);

    expect(resumo.total).toBe(99);
    expect(resumo.fora).toBe(3);
    expect(resumo.dentro).toBe(96);
    // 96/99 = 96,97% → arredonda para 97% (selo "Regular", sem alerta falso).
    expect(Math.round(resumo.percentualConformidade)).toBe(97);
  });

  it('não repete a concentração antiga na primeira faixa', () => {
    const primeira = DISTANCIAS_GEO_DEMO.filter((distancia) => distancia <= 50).length;

    expect(primeira).toBe(48);
    expect(primeira).toBeLessThan(DISTANCIAS_GEO_DEMO.length);
    // Nenhuma distância inválida (negativa ou absurda) na vitrine.
    expect(DISTANCIAS_GEO_DEMO.every((distancia) => distancia > 0 && distancia < 1000)).toBe(true);
  });
});
