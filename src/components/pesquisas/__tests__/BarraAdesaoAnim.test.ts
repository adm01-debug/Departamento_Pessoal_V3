import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  BARRA_PROGRESSO_ATRASO_S,
  BARRA_PROGRESSO_DURACAO_S,
  BARRA_PROGRESSO_EASE,
  BARRA_PROGRESSO_PASSO_CASCATA_S,
  propsPreenchimentoBarraCascata,
} from '@/components/ui/progressMotion';
import {
  atrasoPreenchimento,
  deslocamentoPreenchimento,
  percentualAdesao,
  propsPreenchimentoAdesao,
} from '../barraAdesaoAnim';

/**
 * Paridade PROVADA da barra de adesão de "Pesquisas de Clima & eNPS" com a
 * régua GLOBAL do preenchimento (`ui/progressMotion.ts`), o registro canônico
 * da coreografia do card "Amplitude de Liderança" (Dashboard Executivo): 1,2 s ·
 * `easeOut` · atraso de 0,15 s + índice × 0,1 s. É a mesma régua que o
 * `TotaisHorasCard` e o painel de geofencing consomem.
 *
 * Os números não são redigitados aqui: saem das constantes da régua e do próprio
 * helper global (`propsPreenchimentoBarraCascata`), e são comparados com o que
 * `propsPreenchimentoAdesao` devolve. Se alguém trocar a curva, a duração ou a
 * cascata do preenchimento das pesquisas, este teste cai.
 */

/** Fonte do módulo sob teste — prova que ele não recria números próprios. */
const FONTE_MODULO = readFileSync(path.resolve(process.cwd(), 'src/components/pesquisas/barraAdesaoAnim.ts'), 'utf8');

/** `{ duration, delay, ease }` que o preenchimento realmente recebe. */
type Transicao = { duration: number; delay: number; ease: string };

const transicao = (percentual: number, indice = 0): Transicao =>
  propsPreenchimentoAdesao(percentual, indice).transition as Transicao;
const inicial = (percentual: number, indice = 0) =>
  propsPreenchimentoAdesao(percentual, indice).initial as { x?: string };
const animacao = (percentual: number, indice = 0) =>
  propsPreenchimentoAdesao(percentual, indice).animate as { x?: string };

describe('barra de adesão das pesquisas — paridade com a régua do preenchimento', () => {
  it('a régua é, número por número, a global do sistema', () => {
    // A régua global é a de 1,2 s — o passo `progresso` (1200 ms) do `@theme`.
    expect(BARRA_PROGRESSO_DURACAO_S).toBe(1.2);
    expect(BARRA_PROGRESSO_ATRASO_S).toBe(0.15);
    expect(BARRA_PROGRESSO_PASSO_CASCATA_S).toBe(0.1);
    expect(BARRA_PROGRESSO_EASE).toBe('easeOut');

    // A barra das pesquisas usa a MESMA duração, curva e atraso da régua.
    expect(transicao(72, 0)).toEqual({
      duration: BARRA_PROGRESSO_DURACAO_S,
      delay: BARRA_PROGRESSO_ATRASO_S,
      ease: BARRA_PROGRESSO_EASE,
    });

    // Curva e cascata: 0,15 s na primeira barra, +0,1 s por índice.
    expect(atrasoPreenchimento(0)).toBe(BARRA_PROGRESSO_ATRASO_S);
    expect(atrasoPreenchimento(4)).toBeCloseTo(BARRA_PROGRESSO_ATRASO_S + 4 * BARRA_PROGRESSO_PASSO_CASCATA_S, 5);
  });

  it('entrega a MESMA transição do helper global, índice a índice', () => {
    for (const indice of [0, 1, 4]) {
      expect(transicao(72, indice)).toEqual(propsPreenchimentoBarraCascata(72, indice).transition as Transicao);
    }
  });

  it('não recria a régua: consome as constantes de `ui/progressMotion`', () => {
    expect(FONTE_MODULO).toContain("from '@/components/ui/progressMotion'");
    for (const constante of [
      'BARRA_PROGRESSO_DURACAO_S',
      'BARRA_PROGRESSO_ATRASO_S',
      'BARRA_PROGRESSO_PASSO_CASCATA_S',
      'BARRA_PROGRESSO_EASE',
    ]) {
      expect(FONTE_MODULO).toContain(constante);
    }

    // Também o par "zero → valor": a barra não pode nascer cheia.
    expect(inicial(72)).toEqual({ x: '-100%' });
  });

  it('cresce da esquerda para a direita até o percentual final', () => {
    expect(deslocamentoPreenchimento(0)).toBe('-100%');
    expect(deslocamentoPreenchimento(48)).toBe('-52%');
    expect(deslocamentoPreenchimento(72)).toBe('-28%');
    expect(deslocamentoPreenchimento(91)).toBe('-9%');
    expect(deslocamentoPreenchimento(100)).toBe('-0%');

    // `translateX` é o mesmo eixo do `Progress` do sistema (`-N%`), só animado.
    expect(animacao(48)).toEqual({ x: '-52%' });
  });

  it('normaliza o percentual (limites 0–100 e valor inválido)', () => {
    expect(percentualAdesao(140)).toBe(100);
    expect(percentualAdesao(-20)).toBe(0);
    expect(percentualAdesao(Number.NaN)).toBe(0);
    expect(deslocamentoPreenchimento(140)).toBe('-0%');
    expect(deslocamentoPreenchimento(Number.NaN)).toBe('-100%');
  });

  it('com movimento reduzido nasce cheia, sem transição', () => {
    expect(propsPreenchimentoAdesao(62, 1, true)).toEqual({
      style: { transform: 'translateX(-38%)' },
    });
  });
});
