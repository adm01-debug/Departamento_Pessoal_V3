import { describe, expect, it } from 'vitest';
import type { TargetAndTransition, Variants } from 'framer-motion';
import {
  DESLOCAMENTO_ETAPA_MOBILE_PX,
  DESLOCAMENTO_ETAPA_UNIDADES,
  DESLOCAMENTO_MINI_PX,
  DURACAO_ETAPA_S,
  DURACAO_MINI_S,
  DURACAO_TRIAGEM_S,
  ESCALA_TRIAGEM_INICIAL,
  FRACAO_VISIVEL_PARA_INICIAR,
  VARIANTES_DESLIZE,
  VARIANTES_MINI_CARD,
  VARIANTES_TRIAGEM,
  atrasoEtapa,
  atrasoMiniCard,
  deslocamentoEmPorcentagem,
  duracaoTotalS,
} from '../analyticsFunilAnimacao';

/**
 * A coreografia do Funil é declarativa: cada elemento recebe um `variants` e um
 * `custom` (quando começar / de onde vir). Estes testes resolvem as variantes
 * como o Framer faz — chamando a função com o `custom` — e conferem os números
 * contra a referência aprovada (§6 do pedido):
 *
 *   0–450 ms    Triagem expande do centro (scale 0,65 → 1)
 *   350–700 ms  Entrevista desliza; +120 ms por etapa até 710–1060 ms
 *   950–1250 ms os quatro mini cards sobem, um a cada 100 ms
 *   1550 ms     fim da sequência
 */
function alvo(variantes: Variants, chave: 'oculto' | 'visivel', custom?: unknown): TargetAndTransition {
  const valor = variantes[chave];
  if (typeof valor === 'function') {
    return (valor as (c: unknown) => TargetAndTransition)(custom);
  }
  return valor as TargetAndTransition;
}

describe('analyticsFunilAnimacao — Triagem (expansão do centro)', () => {
  it('começa em 65% com opacidade 0 e chega ao tamanho real com opacidade 1', () => {
    const inicial = alvo(VARIANTES_TRIAGEM, 'oculto');
    const final = alvo(VARIANTES_TRIAGEM, 'visivel');

    expect(inicial).toMatchObject({ opacity: 0, scale: ESCALA_TRIAGEM_INICIAL });
    expect(final).toMatchObject({ opacity: 1, scale: 1 });
    // Sem deslocamento horizontal e sem rotação: a Triagem só EXPANDE.
    expect(inicial).not.toHaveProperty('x');
    expect(inicial).not.toHaveProperty('rotate');
  });

  it('leva 450 ms e começa no primeiro frame da sequência', () => {
    const final = alvo(VARIANTES_TRIAGEM, 'visivel');
    expect(final.transition).toMatchObject({ duration: DURACAO_TRIAGEM_S, delay: 0 });
    expect(DURACAO_TRIAGEM_S).toBe(0.45);
  });
});

describe('analyticsFunilAnimacao — etapas 2 a 5 (deslize da esquerda)', () => {
  it('mantém a ordem e o compasso de 120 ms pedidos na referência', () => {
    // Triagem, Entrevista, Teste, Proposta, Contratado.
    expect([0, 1, 2, 3, 4].map(atrasoEtapa)).toEqual([0, 0.35, 0.47, 0.59, 0.71]);
  });

  it('parte de -24 unidades do desenho e termina na posição de layout (x: 0)', () => {
    const custom = { atraso: atrasoEtapa(1), deslocamento: -DESLOCAMENTO_ETAPA_UNIDADES };
    const inicial = alvo(VARIANTES_DESLIZE, 'oculto', custom);
    const final = alvo(VARIANTES_DESLIZE, 'visivel', custom);

    expect(inicial).toMatchObject({ opacity: 0, x: -DESLOCAMENTO_ETAPA_UNIDADES });
    expect(final).toMatchObject({ opacity: 1, x: 0 });
    expect(final.transition).toMatchObject({ duration: DURACAO_ETAPA_S, delay: 0.35 });
    expect(DURACAO_ETAPA_S).toBe(0.35);
  });

  it('no rótulo HTML (em %) o alvo de chegada é 0% — nunca mistura unidades', () => {
    const deslocamento = deslocamentoEmPorcentagem(-DESLOCAMENTO_ETAPA_UNIDADES, 66.4);
    const inicial = alvo(VARIANTES_DESLIZE, 'oculto', { atraso: 0.47, deslocamento });
    const final = alvo(VARIANTES_DESLIZE, 'visivel', { atraso: 0.47, deslocamento });

    expect(inicial).toMatchObject({ x: deslocamento });
    expect(final).toMatchObject({ x: '0%' });
  });

  it('usa menos deslocamento no mobile — o painel tem 16 px de respiro e recorta o resto', () => {
    expect(DESLOCAMENTO_ETAPA_MOBILE_PX).toBeLessThan(DESLOCAMENTO_ETAPA_UNIDADES);
    expect(DESLOCAMENTO_ETAPA_MOBILE_PX).toBeLessThanOrEqual(16);
  });
});

describe('analyticsFunilAnimacao — mini cards de conversão', () => {
  it('sobe 12 px em 300 ms, um a cada 100 ms, depois da última etapa', () => {
    expect([0, 1, 2, 3].map(atrasoMiniCard)).toEqual([0.95, 1.05, 1.15, 1.25]);

    const custom = { atraso: atrasoMiniCard(3) };
    const inicial = alvo(VARIANTES_MINI_CARD, 'oculto', custom);
    const final = alvo(VARIANTES_MINI_CARD, 'visivel', custom);

    expect(inicial).toMatchObject({ opacity: 0, y: DESLOCAMENTO_MINI_PX });
    expect(final).toMatchObject({ opacity: 1, y: 0 });
    expect(final.transition).toMatchObject({ duration: DURACAO_MINI_S, delay: 1.25 });
  });

  it('o primeiro mini card começa DEPOIS de a última etapa do funil começar', () => {
    expect(atrasoMiniCard(0)).toBeGreaterThan(atrasoEtapa(4));
  });
});

describe('analyticsFunilAnimacao — regras gerais da sequência', () => {
  it('dura ~1,55 s do primeiro frame ao último mini card', () => {
    expect(duracaoTotalS()).toBeCloseTo(1.55, 5);
  });

  it('dispara com 20% do card visível', () => {
    expect(FRACAO_VISIVEL_PARA_INICIAR).toBe(0.2);
  });

  it('é só uma entrada: nada de mola, repetição ou ida e volta', () => {
    const entradas: TargetAndTransition[] = [
      alvo(VARIANTES_TRIAGEM, 'visivel'),
      alvo(VARIANTES_DESLIZE, 'visivel', { atraso: 0.35, deslocamento: 24 }),
      alvo(VARIANTES_MINI_CARD, 'visivel', { atraso: 0.95 }),
    ];
    for (const entrada of entradas) {
      expect(entrada.transition).toMatchObject({ ease: [0, 0, 0.58, 1] });
      expect(entrada.transition).not.toHaveProperty('repeat');
      expect(entrada.transition).not.toHaveProperty('repeatType');
      expect(entrada.transition).not.toHaveProperty('type');
    }
  });

  it('protege os atrasos contra índice inválido (NaN / negativo)', () => {
    expect(atrasoEtapa(Number.NaN)).toBe(0);
    expect(atrasoEtapa(-3)).toBe(0);
    expect(atrasoMiniCard(Number.NaN)).toBeCloseTo(0.95, 5);
    expect(atrasoMiniCard(-1)).toBeCloseTo(0.95, 5);
  });
});

describe('analyticsFunilAnimacao — deslocamento do rótulo em % da própria caixa', () => {
  it('converte as unidades do desenho para a largura do rótulo (seta e texto andam juntos)', () => {
    // Caixa de 66,4 unidades: -24 unidades viram -36,1% da largura do rótulo.
    // O literal é a formatação do double do JS para −2400 ÷ 66,4 (o valor exato
    // com todas as casas não é representável — comparar com ele dava falso
    // negativo por 1 ULP).
    expect(deslocamentoEmPorcentagem(-24, 66.4)).toBe('-36.14457831325301%');
  });

  it('a distância final é sempre as MESMAS 24 unidades do desenho', () => {
    const largura = 84.4;
    const pct = Number.parseFloat(deslocamentoEmPorcentagem(-24, largura)) / 100;
    expect(pct * largura).toBeCloseTo(-24, 6);
  });

  it('cai para 0% sem largura válida (não gera NaN no transform)', () => {
    expect(deslocamentoEmPorcentagem(-24, 0)).toBe('0%');
    expect(deslocamentoEmPorcentagem(-24, Number.NaN)).toBe('0%');
  });
});
