import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { BARRA_PROGRESSO_DURACAO_S } from '@/components/ui/progressMotion';
import { BARRA_DURACAO_S } from '@/components/avaliacao/barraProgressoAnim';
import {
  atrasoPreenchimento,
  deslocamentoPreenchimento,
  percentualAdesao,
  propsPreenchimentoAdesao,
} from '../barraAdesaoAnim';

/**
 * Paridade PROVADA da barra de adesão de "Pesquisas de Clima & eNPS" com o card
 * de referência "Amplitude de Liderança" (`DashboardExecutivoPage`, aba
 * Estrutura).
 *
 * Os números não são redigitados aqui: são LIDOS do fonte da referência (mesma
 * técnica de `DesempenhoBarrasProgresso.test.tsx`) e comparados com o que
 * `propsPreenchimentoAdesao` devolve. Se alguém trocar a curva, a duração ou a
 * cascata da barra das pesquisas, este teste cai.
 */

/** Fonte do card de referência ("Amplitude de Liderança"). */
const FONTE_REFERENCIA = readFileSync(path.resolve(process.cwd(), 'src/pages/DashboardExecutivoPage.tsx'), 'utf8');

/** `{ duration, delay, ease }` que o preenchimento realmente recebe. */
const transicao = (percentual: number, indice = 0) => (propsPreenchimentoAdesao(percentual, indice) as any).transition;

describe('barra de adesão das pesquisas — paridade com "Amplitude de Liderança"', () => {
  it('a régua é, número por número, a do card de referência', () => {
    const referencia = FONTE_REFERENCIA.match(
      /transition=\{\{ duration: ([\w.]+), delay: ([\d.]+) \+ i \* ([\d.]+), ease: '([\w]+)' \}\}/
    );
    expect(referencia, 'transição de "Amplitude de Liderança" não encontrada').not.toBeNull();
    const [, duracao, atraso, passo, ease] = referencia as RegExpMatchArray;

    // A referência usa a régua global (1,2 s) e a barra das pesquisas usa a
    // MESMA constante — nada de uma duração "própria" nascendo aqui.
    expect(duracao).toBe('BARRA_PROGRESSO_DURACAO_S');
    expect(transicao(72, 0).duration).toBe(BARRA_DURACAO_S);
    expect(BARRA_DURACAO_S).toBe(BARRA_PROGRESSO_DURACAO_S);
    expect(transicao(72, 0).duration).toBe(1.2);

    // Curva e cascata: 0,15 s na primeira barra, +0,1 s por índice.
    expect(transicao(72, 0).ease).toBe(ease);
    expect(atrasoPreenchimento(0)).toBe(Number(atraso));
    expect(atrasoPreenchimento(4)).toBeCloseTo(Number(atraso) + 4 * Number(passo), 5);

    // Também o par "zero → valor": a barra não pode nascer cheia.
    expect(FONTE_REFERENCIA).toContain('initial={{ width: 0 }}');
    expect((propsPreenchimentoAdesao(72) as any).initial).toEqual({ x: '-100%' });
  });

  it('cresce da esquerda para a direita até o percentual final', () => {
    expect(deslocamentoPreenchimento(0)).toBe('-100%');
    expect(deslocamentoPreenchimento(48)).toBe('-52%');
    expect(deslocamentoPreenchimento(72)).toBe('-28%');
    expect(deslocamentoPreenchimento(91)).toBe('-9%');
    expect(deslocamentoPreenchimento(100)).toBe('-0%');

    // `translateX` é o mesmo eixo do `Progress` do sistema (`-N%`), só animado.
    expect((propsPreenchimentoAdesao(48) as any).animate).toEqual({ x: '-52%' });
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
