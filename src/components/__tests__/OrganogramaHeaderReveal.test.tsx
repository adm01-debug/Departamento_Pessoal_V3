import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { cardVariants } from '@/components/dashboard/MetricCard';
import { HEADER_REVEAL } from '../organograma/organogramaHeaderReveal';

/** `visible` é função do `custom` na régua global — o tipo do Framer é união. */
const visivelDoSlot = cardVariants.visible as (posicao: number) => {
  opacity: number;
  y: number;
  transition: { delay: number; duration: number; ease: number[] };
};

/**
 * Fila do cabeçalho, na ordem em que o olho encontra os itens (esquerda →
 * direita). É a mesma ordem declarada em `organogramaHeaderReveal.ts`: os três
 * cards (`OrganogramaStats`), depois a busca e os dois botões
 * (`OrganogramaToolbar`).
 */
const ORDEM_VISUAL = ['departamentos', 'colaboradores', 'niveis', 'busca', 'expandirTudo', 'recolherTudo'];

describe('organogramaHeaderReveal', () => {
  it('declara os seis itens na ordem visual, com índices únicos e sem buraco', () => {
    expect(Object.keys(HEADER_REVEAL)).toEqual(ORDEM_VISUAL);
    expect(Object.values(HEADER_REVEAL)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(new Set(Object.values(HEADER_REVEAL)).size).toBe(ORDEM_VISUAL.length);
  });

  it('não recria a animação: os slots valem o exato `cardVariants` da régua global', () => {
    // Referência: `cardVariants` de `dashboard/MetricCard.tsx`, que hoje É a
    // régua global (`ui/entradaGlobal.ts`): fade + subida de 14px, 520ms e
    // 120ms entre inícios.
    expect(cardVariants.hidden).toEqual({ opacity: 0, y: 14 });

    for (const slot of Object.values(HEADER_REVEAL)) {
      expect(visivelDoSlot(slot)).toEqual({
        opacity: 1,
        y: 0,
        transition: { delay: slot * 0.12, duration: 0.52, ease: [0, 0, 0.58, 1] },
      });
    }
  });

  it('fecha a cascata do cabeçalho em 1.12s, no compasso dos cards do sistema', () => {
    // "Recolher tudo" é o último item: entra em 0.60s e dura 0.52s.
    const ultimo = visivelDoSlot(HEADER_REVEAL.recolherTudo);
    expect(ultimo.transition.delay + ultimo.transition.duration).toBeCloseTo(1.12, 5);
  });

  it('os dois componentes do cabeçalho leem os slots daqui, na ordem visual (sem índice solto)', () => {
    // A extração é ORDENADA pela posição no arquivo — nos dois componentes o JSX
    // está na ordem em que o olho vê o cabeçalho, então a sequência é a própria
    // cascata da esquerda para a direita: cards (0..2) e depois busca/botões
    // (3..5). Índice escrito à mão (`custom={4}`) não teria como acompanhar isso.
    const stats = readFileSync(resolve(process.cwd(), 'src/components/organograma/OrganogramaStats.tsx'), 'utf8');
    const toolbar = readFileSync(resolve(process.cwd(), 'src/components/organograma/OrganogramaToolbar.tsx'), 'utf8');
    const header = `${stats}\n${toolbar}`;

    const slots = [...header.matchAll(/HEADER_REVEAL\.(\w+)/g)].map((m) => m[1]);
    expect(slots).toEqual(ORDEM_VISUAL);
    expect(header).not.toMatch(/custom=\{\d+\}/);
  });
});
