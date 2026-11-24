import { describe, it, expect } from 'vitest';
import {
  CASCATA_ATRASO_S,
  CASCATA_DURACAO_S,
  CASCATA_PASSO_S,
  CASCATA_Y_INICIAL,
  EASE_FEEDBACKS,
  EXPANSAO_CLIP_FINAL,
  EXPANSAO_CLIP_INICIAL,
  EXPANSAO_DURACAO_S,
  EXPANSAO_ESCALA_INICIAL,
  atrasoDoCard,
  cardEntradaFeedback,
  entradaFeedbackVariants,
} from '@/components/avaliacao/animacaoFeedbacks';

/**
 * Guarda da RÉGUA de entrada dos cards de "Feedbacks": expansão do centro para
 * as bordas no 1º card + descida em cascata nos demais. Os números são a
 * especificação da tela — se alguém afrouxar um deles (foi o que deixou o efeito
 * imperceptível antes: escala 0.94, y −22, 0.48 s, passo 0.09 s), este teste
 * falha antes de o movimento voltar a ficar discreto.
 */

/** Recupera uma variante dirigida por `custom` no formato que o Framer espera. */
const variante = (nome: 'hidden' | 'visible') =>
  entradaFeedbackVariants[nome] as unknown as (i: number) => Record<string, unknown>;

describe('Feedbacks — régua da entrada', () => {
  it('usa exatamente os parâmetros especificados', () => {
    expect(EXPANSAO_DURACAO_S).toBe(0.9);
    expect(EXPANSAO_ESCALA_INICIAL).toBe(0.78);
    expect(EXPANSAO_CLIP_INICIAL).toBe('inset(35% 25% round 16px)');
    expect(EXPANSAO_CLIP_FINAL).toBe('inset(0% 0% round 16px)');
    expect(CASCATA_DURACAO_S).toBe(0.6);
    expect(CASCATA_PASSO_S).toBe(0.2);
    expect(CASCATA_Y_INICIAL).toBe(-48);
    expect(EASE_FEEDBACKS).toEqual([0.22, 1, 0.36, 1]);
  });

  it('o 1º card expande do centro (escala + recorte) e os demais descem 48 px', () => {
    expect(variante('hidden')(0)).toMatchObject({
      opacity: 0,
      scale: EXPANSAO_ESCALA_INICIAL,
      clipPath: EXPANSAO_CLIP_INICIAL,
    });
    expect(variante('visible')(0)).toMatchObject({
      opacity: 1,
      scale: 1,
      clipPath: [EXPANSAO_CLIP_INICIAL, EXPANSAO_CLIP_FINAL],
    });
    expect(variante('hidden')(1)).toMatchObject({ opacity: 0, y: CASCATA_Y_INICIAL });
    expect(variante('visible')(1)).toMatchObject({ opacity: 1, y: 0 });
    // O 1º card é o ÚNICO com expansão; do 2º em diante é deslocamento.
    expect(variante('hidden')(2)).not.toHaveProperty('scale');
    expect(variante('visible')(3)).not.toHaveProperty('clipPath');
  });

  it('encadeia a cascata: o 2º começa quando o 1º termina, +0,2 s por card', () => {
    expect(atrasoDoCard(0)).toBe(0);
    expect(CASCATA_ATRASO_S).toBe(EXPANSAO_DURACAO_S);
    expect(atrasoDoCard(1)).toBe(0.9);
    expect(atrasoDoCard(2)).toBe(1.1);
    expect(atrasoDoCard(3)).toBe(1.3);
    expect(atrasoDoCard(6)).toBe(1.9);
  });

  it('a duração de cada etapa é a especificada', () => {
    expect(variante('visible')(0).transition).toMatchObject({ duration: 0.9, ease: EASE_FEEDBACKS });
    expect(variante('visible')(2).transition).toMatchObject({
      delay: 1.1,
      duration: 0.6,
      ease: EASE_FEEDBACKS,
    });
  });

  it('o card não tem gatilho próprio: só `custom` + `variants` (o pai comanda)', () => {
    expect(cardEntradaFeedback(3)).toEqual({ custom: 3, variants: entradaFeedbackVariants });
    expect(cardEntradaFeedback(-1).custom).toBe(0);
    expect(Object.keys(cardEntradaFeedback(2))).toEqual(['custom', 'variants']);
  });
});
