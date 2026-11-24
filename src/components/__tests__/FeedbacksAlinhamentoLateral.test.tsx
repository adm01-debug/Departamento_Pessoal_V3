import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  ALTURA_MARCO_MES,
  DESLOCAMENTO_LATERAL,
  VAO_MARCO_CARDS,
} from '@/components/avaliacao/FeedbacksTimeline';

/**
 * GUARDA DO ALINHAMENTO LATERAL — aba "Feedbacks".
 *
 * A coluna de widgets precisa começar na MESMA altura do primeiro card de
 * feedback (e não na do marco do mês, que fica acima dele). Isso depende de
 * números que vivem em DOIS arquivos:
 *
 *   • `FeedbacksTimeline` → altura fixa do marco + o vão `space-y-3` até o card;
 *   • `FeedbacksTab`      → o padding superior da coluna lateral, só em `xl`.
 *
 * Sem esta guarda, mudar um sem o outro desalinharia em silêncio (e só apareceria
 * como "36px de diferença" numa revisão visual futura). A leitura dos arquivos é
 * proposital: é o único jeito de checar a classe Tailwind, que precisa ser um
 * literal no código para o Tailwind gerar o CSS.
 */

const ler = (relativo: string) => fs.readFileSync(new URL(relativo, import.meta.url), 'utf8');

const TAB = ler('../avaliacao/FeedbacksTab.tsx');
const TIMELINE = ler('../avaliacao/FeedbacksTimeline.tsx');

describe('Feedbacks — alinhamento da coluna lateral', () => {
  it('o deslocamento é a soma da altura do marco com o vão até o primeiro card', () => {
    expect(ALTURA_MARCO_MES).toBe(18);
    expect(VAO_MARCO_CARDS).toBe(12);
    expect(DESLOCAMENTO_LATERAL).toBe(ALTURA_MARCO_MES + VAO_MARCO_CARDS);
  });

  it('o marco do mês tem altura FIXA e rótulo que não quebra (base do alinhamento)', () => {
    expect(TIMELINE).toContain('style={{ height: ALTURA_MARCO_MES }}');
    // O vão até o primeiro card é o `space-y-3` da seção do grupo.
    expect(TIMELINE).toContain('<section key={grupo.chave} className="space-y-3">');
  });

  it('a coluna lateral aplica exatamente o deslocamento, e só em duas colunas', () => {
    expect(TAB).toContain(`xl:pt-[${DESLOCAMENTO_LATERAL}px]`);

    // A compensação só pode existir no breakpoint de duas colunas: o ÚNICO
    // `className` com padding-top arbitrário é o da coluna lateral, e ele é
    // `xl:` (empilhado, nada é compensado).
    const classNames = [...TAB.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);
    const comPadding = classNames.filter((c) => /pt-\[\d+px\]/.test(c));
    expect(comPadding).toHaveLength(1);
    expect(comPadding[0]).toContain(`xl:pt-[${DESLOCAMENTO_LATERAL}px]`);
  });

  it('o grid das duas colunas continua com a coluna lateral de 320px', () => {
    expect(TAB).toContain('xl:grid-cols-[minmax(0,1fr)_320px]');
  });
});
