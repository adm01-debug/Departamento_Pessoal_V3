import { describe, expect, it } from 'vitest';
import {
  distanciaEmMetros,
  faixasDeDistancia,
  formatarDistancia,
  horaCurta,
  iniciaisDoNome,
  intervaloAnterior,
  intervaloDoPeriodo,
  montarPontos,
  passoDaFaixa,
  registrosRecentes,
  resumoGeo,
  rotuloDataCurta,
  rotuloOrigemGeo,
  serieDiaria,
  variacaoPercentual,
  type PontoGeografico,
  type UnidadeGeografica,
} from '@/utils/pontoGeofencing';
import { UNIDADE_GEO_DEMO, batidasGeoDemonstrativas } from '@/mocks/pontoGeoMock';

const UNIDADE: UnidadeGeografica = {
  id: 'u1',
  nome: 'Unidade Teste',
  latitude: -23.5,
  longitude: -46.6,
  raioMetros: 100,
};

/** Ponto sintético a uma distância conhecida da unidade. */
function ponto(distanciaMetros: number, extra: Partial<PontoGeografico> = {}): PontoGeografico {
  return {
    id: `p-${distanciaMetros}-${extra.hora ?? ''}-${extra.data ?? ''}`,
    colaboradorId: 'c1',
    colaboradorNome: 'Ana Martins',
    colaboradorFoto: null,
    data: '2026-11-05',
    hora: '08:00',
    tipo: 'entrada',
    origem: 'web',
    latitude: UNIDADE.latitude,
    longitude: UNIDADE.longitude,
    distanciaMetros,
    dentroRaio: distanciaMetros <= UNIDADE.raioMetros,
    ...extra,
  };
}

describe('pontoGeofencing · distância e situação', () => {
  it('mede a distância com a mesma fórmula do registro de ponto', () => {
    // 0,001° de latitude ≈ 111,2 m
    expect(distanciaEmMetros(0, 0, 0.001, 0)).toBeCloseTo(111.19, 1);
    expect(distanciaEmMetros(UNIDADE.latitude, UNIDADE.longitude, UNIDADE.latitude, UNIDADE.longitude)).toBe(0);
  });

  it('descarta registros sem coordenada válida e recalcula a situação pelo raio atual', () => {
    const pontos = montarPontos(
      [
        { id: 'a', latitude: UNIDADE.latitude, longitude: UNIDADE.longitude, dentro_raio: true },
        { id: 'b', latitude: null, longitude: null, dentro_raio: true },
        { id: 'c', latitude: 0, longitude: 0, dentro_raio: true },
        // Gravada como "fora" no passado, mas a ~50 m da unidade atual:
        { id: 'd', latitude: -23.50045, longitude: -46.6, dentro_raio: false },
        // Distância já gravada manda (coluna preenchida):
        { id: 'e', latitude: -23.5, longitude: -46.6, distancia_local_metros: '180' },
      ],
      UNIDADE
    );

    expect(pontos.map((p) => p.id)).toEqual(['a', 'd', 'e']);
    expect(pontos[1].dentroRaio).toBe(true);
    expect(pontos[2].distanciaMetros).toBe(180);
    expect(pontos[2].dentroRaio).toBe(false);
  });

  it('normaliza hora, iniciais e origem para os rótulos da tela', () => {
    expect(horaCurta('08:12:47')).toBe('08:12');
    expect(horaCurta(null)).toBe('--:--');
    expect(iniciaisDoNome('Carlos Silva')).toBe('CS');
    expect(iniciaisDoNome('Ana')).toBe('AN');
    expect(iniciaisDoNome('')).toBe('—');
    expect(rotuloOrigemGeo('kiosk')).toBe('Kiosk');
    expect(rotuloOrigemGeo('mobile')).toBe('Mobile');
    expect(rotuloOrigemGeo(null)).toBe('Registrado');
  });
});

describe('pontoGeofencing · períodos', () => {
  it('fecha a janela do período no dia de hoje', () => {
    expect(intervaloDoPeriodo('hoje', '2026-11-05')).toEqual({ inicio: '2026-11-05', fim: '2026-11-05' });
    expect(intervaloDoPeriodo('7d', '2026-11-05')).toEqual({ inicio: '2026-10-30', fim: '2026-11-05' });
    expect(intervaloDoPeriodo('30d', '2026-11-05')).toEqual({ inicio: '2026-10-07', fim: '2026-11-05' });
  });

  it('devolve o intervalo anterior com a mesma duração', () => {
    expect(intervaloAnterior({ inicio: '2026-10-30', fim: '2026-11-05' })).toEqual({
      inicio: '2026-10-23',
      fim: '2026-10-29',
    });
  });

  it('só calcula variação com base comparativa', () => {
    expect(variacaoPercentual(27, 25)).toBe(8);
    expect(variacaoPercentual(0, 0)).toBe(0);
    expect(variacaoPercentual(3, 0)).toBeNull();
    expect(variacaoPercentual(Number.NaN, 10)).toBeNull();
  });
});

describe('pontoGeofencing · conformidade e faixas', () => {
  it('resume totais, conformidade e distância média', () => {
    const resumo = resumoGeo([ponto(10), ponto(30), ponto(150)]);
    expect(resumo.total).toBe(3);
    expect(resumo.dentro).toBe(2);
    expect(resumo.fora).toBe(1);
    expect(resumo.percentualConformidade).toBeCloseTo(66.67, 1);
    expect(resumo.percentualFora).toBeCloseTo(33.33, 1);
    expect(resumo.distanciaMedia).toBeCloseTo(63.33, 1);
    expect(resumoGeo([])).toEqual({
      total: 0,
      dentro: 0,
      fora: 0,
      percentualConformidade: 0,
      percentualFora: 0,
      distanciaMedia: 0,
    });
  });

  it('adapta o passo das faixas ao raio configurado, sem assumir 100 m', () => {
    expect(passoDaFaixa(100)).toBe(20);
    expect(passoDaFaixa(200)).toBe(50);
    expect(passoDaFaixa(400)).toBe(100);
    expect(passoDaFaixa(800)).toBe(200);
    // Raio 100 m → cinco faixas de 20 m + a faixa "acima do raio".
    expect(faixasDeDistancia([], 100).map((f) => f.rotulo)).toEqual([
      '0 – 20 m',
      '20 – 40 m',
      '40 – 60 m',
      '60 – 80 m',
      '80 – 100 m',
      '> 100 m',
    ]);
  });

  it('classifica cada registro na faixa certa e soma o total', () => {
    const pontos = [ponto(5), ponto(19), ponto(20), ponto(39), ponto(55), ponto(100), ponto(101), ponto(240)];
    const faixas = faixasDeDistancia(pontos, 100);

    // 100 m é exatamente o raio: continua na última faixa interna.
    expect(faixas.map((f) => f.quantidade)).toEqual([2, 2, 1, 0, 1, 2]);
    expect(faixas.reduce((soma, f) => soma + f.quantidade, 0)).toBe(pontos.length);
    expect(faixas[5].foraDoRaio).toBe(true);
    expect(faixas[1].percentual).toBeCloseTo(25, 5);
  });
});

describe('pontoGeofencing · séries e ordenação', () => {
  it('conta um valor por dia do intervalo, inclusive os dias vazios', () => {
    const serie = serieDiaria(
      [ponto(10, { data: '2026-11-03' }), ponto(20, { data: '2026-11-03' }), ponto(30, { data: '2026-11-05' })],
      { inicio: '2026-11-01', fim: '2026-11-05' }
    );
    expect(serie).toEqual([0, 0, 2, 0, 1]);
  });

  it('ordena os mais recentes primeiro e respeita o limite', () => {
    const pontos = [
      ponto(10, { id: 'antigo', data: '2026-11-01', hora: '08:00' }),
      ponto(10, { id: 'novo', data: '2026-11-05', hora: '07:59' }),
      ponto(10, { id: 'meio', data: '2026-11-05', hora: '09:10' }),
    ];
    expect(registrosRecentes(pontos).map((p) => p.id)).toEqual(['meio', 'novo', 'antigo']);
    expect(registrosRecentes(pontos, 1).map((p) => p.id)).toEqual(['meio']);
  });

  it('formata data curta e distância', () => {
    expect(rotuloDataCurta('2026-11-05', '2026-11-05')).toBe('Hoje');
    expect(rotuloDataCurta('2026-11-03', '2026-11-05')).toBe('03/11');
    expect(rotuloDataCurta(null)).toBe('—');
    expect(formatarDistancia(29)).toBe('29 m');
    expect(formatarDistancia(1284)).toBe('1,3 km');
    expect(formatarDistancia(null)).toBe('—');
  });
});

describe('pontoGeofencing · vitrine demonstrativa', () => {
  const hoje = '2026-11-05';
  const cruas = batidasGeoDemonstrativas(hoje);

  it('reproduz os números da referência no período de 7 dias', () => {
    const pontos7d = montarPontos(
      cruas.filter((b) => String(b.data) >= '2026-10-30' && String(b.data) <= hoje),
      UNIDADE_GEO_DEMO
    );
    const resumo = resumoGeo(pontos7d);

    expect(resumo.total).toBe(27);
    expect(resumo.dentro).toBe(27);
    expect(resumo.fora).toBe(0);
    expect(Math.round(resumo.distanciaMedia)).toBe(29);
    expect(faixasDeDistancia(pontos7d, UNIDADE_GEO_DEMO.raioMetros).map((f) => f.quantidade)).toEqual([
      8, 12, 5, 2, 0, 0,
    ]);
  });

  it('deriva as variações do período anterior (nada digitado no painel)', () => {
    const recorte = (inicio: string, fim: string) =>
      resumoGeo(
        montarPontos(
          cruas.filter((b) => String(b.data) >= inicio && String(b.data) <= fim),
          UNIDADE_GEO_DEMO
        )
      );

    const atual = recorte('2026-10-30', hoje);
    const anterior = recorte('2026-10-23', '2026-10-29');

    expect(variacaoPercentual(atual.total, anterior.total)).toBe(8);
    expect(variacaoPercentual(atual.dentro, anterior.dentro)).toBe(8);
    expect(variacaoPercentual(atual.fora, anterior.fora)).toBe(0);
    expect(variacaoPercentual(Math.round(atual.distanciaMedia), Math.round(anterior.distanciaMedia))).toBe(-12);
  });

  it('exercita o estado de alerta em 30 dias (registros fora do raio)', () => {
    const pontos30d = montarPontos(
      cruas.filter((b) => String(b.data) >= '2026-10-07' && String(b.data) <= hoje),
      UNIDADE_GEO_DEMO
    );
    const resumo = resumoGeo(pontos30d);
    const faixas = faixasDeDistancia(pontos30d, UNIDADE_GEO_DEMO.raioMetros);

    expect(resumo.total).toBe(74);
    expect(resumo.fora).toBe(2);
    expect(faixas[faixas.length - 1].quantidade).toBe(2);
  });
});
