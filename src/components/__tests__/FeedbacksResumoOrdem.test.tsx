import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { FeedbacksResumo } from '@/components/avaliacao/FeedbacksResumo';
import {
  COR_TIPO_FEEDBACK,
  FAIXAS_NOTA,
  TRACO_TIPO_FEEDBACK,
  type LinhaDistribuicao,
  type LinhaTipo,
} from '@/components/avaliacao/feedbacksComum';

/**
 * ============================================================================
 * GUARDA DA ORDEM DA COLUNA LATERAL — aba "Feedbacks".
 *
 * A ordem aprovada é: **Dica → Distribuição de notas → Tipos de feedback**.
 * A Dica abre a coluna (era o último widget e passou a ser o primeiro por
 * pedido explícito do usuário), então nada pode empurrá-la de volta para baixo
 * — nem uma reordenação de JSX, nem um `order-*` de CSS.
 *
 * Duas provas complementares:
 *   1. DOM — a ordem de leitura dos títulos, medida no componente renderizado;
 *   2. FONTE — os índices da cascata (`indiceBase`, +1, +2) crescem na MESMA
 *      ordem da leitura, para a animação de entrada não "subir" a coluna.
 * ============================================================================
 */

const DISTRIBUICAO: LinhaDistribuicao[] = FAIXAS_NOTA.map((faixa, i) => ({
  ...faixa,
  quantidade: 5 - i,
  percentual: (5 - i) * 10,
}));

const TIPOS: LinhaTipo[] = (['gestor', 'par', 'auto'] as const).map((tipo, i) => ({
  tipo,
  rotulo: tipo,
  cor: COR_TIPO_FEEDBACK[tipo],
  traco: TRACO_TIPO_FEEDBACK[tipo],
  quantidade: 6 - i,
  percentual: 60 - i * 20,
}));

const ORDEM_ESPERADA = ['Dica', 'Distribuição de notas', 'Tipos de feedback'];

/**
 * Fonte do componente, para a guarda dos índices da cascata. Resolvida pelo
 * diretório de trabalho (raiz do repositório) porque, em ambiente jsdom, o
 * `import.meta.url` deste teste não vem com esquema `file:`.
 */
const FONTE_RESUMO = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/avaliacao/FeedbacksResumo.tsx'),
  'utf8'
);

function renderizar(overrides: Partial<React.ComponentProps<typeof FeedbacksResumo>> = {}) {
  return render(
    <FeedbacksResumo
      distribuicao={DISTRIBUICAO}
      media={3.7}
      delta={-0.3}
      tipos={TIPOS}
      total={11}
      indiceBase={2}
      reduzirMovimento
      onNovoFeedback={vi.fn()}
      {...overrides}
    />
  );
}

describe('Feedbacks — ordem dos widgets da coluna lateral', () => {
  it('a "Dica" é o PRIMEIRO widget, antes de "Distribuição de notas"', () => {
    renderizar();

    const titulos = screen
      .getAllByRole('heading')
      .map((h) => h.textContent?.trim() ?? '')
      .filter((texto) => ORDEM_ESPERADA.includes(texto));

    expect(titulos).toEqual(ORDEM_ESPERADA);
  });

  it('o CTA "Novo Feedback" viaja junto com a Dica (1º card da coluna)', () => {
    renderizar();

    const botao = screen.getByRole('button', { name: /Novo feedback/i });
    const card = botao.closest('[class*="border-primary/25"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('Dica');
  });

  it('os índices da cascata sobem na ordem de leitura (Dica = indiceBase)', () => {
    const fonte = FONTE_RESUMO;

    const posicao = (trecho: string) => {
      const i = fonte.indexOf(trecho);
      expect(i, `trecho ausente na fonte: ${trecho}`).toBeGreaterThan(-1);
      return i;
    };

    // A Dica é o card que recebe `indiceBase` "cru"; os demais somam 1 e 2 e
    // precisam aparecer DEPOIS dela no JSX.
    const dica = posicao('{...entradaCard(indiceBase)}');
    const distribuicao = posicao('titulo="Distribuição de notas" indice={indiceBase + 1}');
    const tipos = posicao('titulo="Tipos de feedback" indice={indiceBase + 2}');

    expect(dica).toBeLessThan(distribuicao);
    expect(distribuicao).toBeLessThan(tipos);
    // Nenhum widget pode reivindicar o índice 0 da coluna por fora do `indiceBase`.
    expect(fonte).not.toContain('entradaCard(0)');
  });
});
