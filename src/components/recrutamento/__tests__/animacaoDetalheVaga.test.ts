import { describe, it, expect } from 'vitest';
import type { Variants } from 'framer-motion';
import {
  CURVA_DOBRA,
  DOBRA_CONTEUDO_ATRASO_S,
  DOBRA_CONTEUDO_DURACAO_S,
  DOBRA_DURACAO_REDUZIDA_S,
  DOBRA_DURACAO_S,
  ETAPA_ATRASO_S,
  ETAPA_DESLOCAMENTO_PX,
  ETAPA_DURACAO_S,
  ETAPA_PASSO_S,
  variantesDetalheVaga,
} from '../animacaoDetalheVaga';

/**
 * A dobra do detalhe da vaga é um accordion de ALTURA: estes testes travam a
 * régua combinada (300 ms, `ease-standard`, 6 px, cascata curta) e o
 * comportamento em movimento reduzido, que é onde a animação pode virar um
 * "pulo" de layout sem ninguém notar.
 */
describe('animação da dobra do detalhe da vaga', () => {
  const abertura = variantesDetalheVaga(false);
  const reduzida = variantesDetalheVaga(true);

  it('usa a curva simétrica do sistema e o tempo da faixa de expandir/recolher', () => {
    // `--ease-standard` de src/index.css e 250–350 ms (docs/motion-regua-global.md §2).
    expect(CURVA_DOBRA).toEqual([0.4, 0, 0.2, 1]);
    expect(DOBRA_DURACAO_S).toBe(0.3);
    expect(DOBRA_DURACAO_S).toBeGreaterThanOrEqual(0.25);
    expect(DOBRA_DURACAO_S).toBeLessThanOrEqual(0.35);
  });

  it('expande de altura 0 até a altura real e recolhe de volta a 0', () => {
    const aberto = abertura.dobra.aberto as Record<string, unknown>;
    const recolhido = abertura.dobra.recolhido as Record<string, unknown>;

    expect(recolhido.height).toBe(0);
    expect(aberto.height).toBe('auto');
    // Nada de escala, mola ou deslocamento: só altura e opacidade.
    expect(aberto).not.toHaveProperty('scale');
    expect(recolhido).not.toHaveProperty('scale');
    expect(aberto).not.toHaveProperty('y');
    expect(aberto.transition).toEqual({
      height: { duration: DOBRA_DURACAO_S, ease: CURVA_DOBRA },
      opacity: { duration: DOBRA_CONTEUDO_DURACAO_S, ease: CURVA_DOBRA, delay: DOBRA_CONTEUDO_ATRASO_S },
    });
  });

  it('o conteúdo interno entra em fade depois de a dobra começar a abrir', () => {
    const conteudoAberto = abertura.conteudo.aberto as Record<string, unknown>;
    expect(DOBRA_CONTEUDO_ATRASO_S).toBeGreaterThan(0);
    expect(conteudoAberto.opacity).toBe(1);
    expect((abertura.conteudo.recolhido as Record<string, unknown>).opacity).toBe(0);
    expect((conteudoAberto.transition as { delay: number }).delay).toBe(DOBRA_CONTEUDO_ATRASO_S);
    // Sem deslocamento: o fade do conteúdo não empurra nenhuma linha.
    expect(conteudoAberto).not.toHaveProperty('y');
    expect(conteudoAberto).not.toHaveProperty('height');
  });

  it('as cinco etapas entram em cascata de 6 px dentro do mesmo compasso', () => {
    expect(ETAPA_DESLOCAMENTO_PX).toBe(6);
    expect((abertura.etapa.recolhido as Record<string, unknown>).y).toBe(-ETAPA_DESLOCAMENTO_PX);
    expect((abertura.etapa.aberto as Record<string, unknown>).y).toBe(0);

    const container = abertura.etapas.aberto as { transition: Record<string, number> };
    expect(container.transition.staggerChildren).toBe(ETAPA_PASSO_S);
    expect(container.transition.delayChildren).toBe(ETAPA_ATRASO_S);

    // A última das cinco etapas precisa terminar junto com a dobra (300 ms).
    const ultimaComeca = ETAPA_ATRASO_S + ETAPA_PASSO_S * 4;
    expect(ultimaComeca).toBeLessThan(DOBRA_DURACAO_S);
    expect(ultimaComeca + ETAPA_DURACAO_S).toBeLessThanOrEqual(DOBRA_DURACAO_S + 0.02);
  });

  it('no fechamento a cascata das etapas é mais curta que a da abertura', () => {
    const saida = abertura.etapas.recolhido as { transition: Record<string, number> };
    expect(saida.transition.staggerChildren).toBeLessThan(ETAPA_PASSO_S);
    expect(saida.transition.staggerDirection).toBe(-1);
    expect((abertura.etapa.recolhido as Record<string, unknown>).opacity).toBe(0);
  });

  it('com movimento reduzido a altura vai a 0 ↔ auto sem deslocamento nem cascata', () => {
    const aberto = reduzida.dobra.aberto as Record<string, unknown>;
    expect(aberto.height).toBe('auto');
    expect((reduzida.dobra.recolhido as Record<string, unknown>).height).toBe(0);
    expect(DOBRA_DURACAO_REDUZIDA_S).toBeLessThan(DOBRA_DURACAO_S);
    expect((aberto.transition as { duration: number }).duration).toBe(DOBRA_DURACAO_REDUZIDA_S);

    // A etapa perde o translateY e a cascata vira instantânea.
    expect((reduzida.etapa.recolhido as Record<string, unknown>).y).toBeUndefined();
    expect((reduzida.etapa.aberto as Record<string, unknown>).y).toBeUndefined();
    const container = reduzida.etapas.aberto as { transition: Record<string, number> };
    expect(container.transition.staggerChildren).toBe(0);
    expect(container.transition.delayChildren).toBe(0);
  });

  it('as duas variantes da dobra usam os mesmos rótulos que o componente aciona', () => {
    const rotulos = (variantes: Variants) => Object.keys(variantes).sort();
    expect(rotulos(abertura.dobra)).toEqual(['aberto', 'recolhido']);
    expect(rotulos(abertura.conteudo)).toEqual(['aberto', 'recolhido']);
    expect(rotulos(abertura.etapas)).toEqual(['aberto', 'recolhido']);
    expect(rotulos(abertura.etapa)).toEqual(['aberto', 'recolhido']);
    expect(rotulos(reduzida.dobra)).toEqual(['aberto', 'recolhido']);
  });
});
