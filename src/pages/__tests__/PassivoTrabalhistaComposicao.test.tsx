import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * CARD "COMPOSIÇÃO DO PASSIVO" — CENTRALIZAÇÃO DO BLOCO ROSCA + LEGENDAS.
 *
 * O que este teste trava:
 *   1. o container que agrupa a rosca e a lista de legendas ocupa 100% da
 *      largura útil do card e centraliza o conjunto (`flex w-full items-center
 *      justify-center`), sem margem/padding fixo empurrando para um lado;
 *   2. a caixa do gráfico tem EXATAMENTE o diâmetro do anel (188 px = 2 ×
 *      `outerRadius` 94), cravado em `style` inline. É o ponto central da
 *      correção: `h-[200px] w-[200px]` vira 12.5rem pelo plugin px→rem do
 *      PostCSS e, com a base do `<html>` em 125% (20 px), mede 250 px — o anel
 *      de 188 px ficava com 31 px de vão morto de cada lado DENTRO da caixa e,
 *      como a legenda é `flex-1` (cola na borda útil direita), o vão aparecia
 *      só à esquerda: o conjunto parecia empurrado para a direita do card;
 *   3. o espaçamento interno rosca → legendas continua existindo e a coluna de
 *      legendas segue `flex-1 min-w-0 space-y-3` (o bloco se move como uma
 *      unidade, sem quebrar o layout em cards estreitos);
 *   4. título, fatias e valores do cenário demonstrativo não mudaram.
 */

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtualId: 'empresa-teste', loadingEmpresas: false }),
}));

import PassivoTrabalhistaPage from '../PassivoTrabalhistaPage';

/** 2 × `PASSIVO_DONUT_OUTER_RADIUS` (94) — px absolutos, imunes à conversão rem. */
const LADO_DA_CAIXA_DO_GRAFICO = '188px';

function renderizarPagina() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PassivoTrabalhistaPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/**
 * Sobe do rótulo da primeira fatia até a linha flex do card:
 *   rótulo → motion.div da linha → coluna das legendas → bloco rosca+legendas.
 */
async function localizarBloco() {
  const card = (await screen.findByText('Composição do Passivo')).closest('.rounded-2xl') as HTMLElement;
  // O card só lista as fatias depois que a consulta assenta (`isLoading` falso);
  // antes disso o container das legendas existe, porém vazio.
  const rotulo = await within(card).findByText('Férias + 1/3', undefined, { timeout: 5000 });
  const linha = rotulo.parentElement as HTMLElement;
  const legendas = linha.parentElement as HTMLElement;
  const bloco = legendas.parentElement as HTMLElement;
  return { card, linha, legendas, bloco, caixaDoGrafico: bloco.firstElementChild as HTMLElement };
}

describe('Passivo Trabalhista — card Composição do Passivo (geometria)', () => {
  it('centraliza o bloco rosca + legendas na largura útil do card', async () => {
    renderizarPagina();
    const { bloco } = await localizarBloco();

    expect(bloco.className).toContain('w-full');
    expect(bloco.className).toContain('justify-center');
    expect(bloco.className).toContain('items-center');
    expect(bloco.className).toContain('gap-12'); // 3rem = 60px na base de 20px
    // Nada de margem/padding fixo empurrando o conjunto para a direita.
    ['ml-auto', 'mr-auto', 'pl-', 'ml-'].forEach((classe) => {
      expect(bloco.className).not.toContain(classe);
    });
    // Só dois filhos: o gráfico e as legendas — o bloco anda como unidade.
    expect(bloco.children).toHaveLength(2);
  });

  it('dá à caixa do gráfico o diâmetro exato do anel, em px inline', async () => {
    renderizarPagina();
    const { caixaDoGrafico } = await localizarBloco();

    expect(caixaDoGrafico.style.width).toBe(LADO_DA_CAIXA_DO_GRAFICO);
    expect(caixaDoGrafico.style.height).toBe(LADO_DA_CAIXA_DO_GRAFICO);
    expect(caixaDoGrafico.className).toContain('shrink-0');
    // A caixa em rem (250px) era a origem dos 31px de vão morto à esquerda.
    expect(caixaDoGrafico.className).not.toContain('w-[200px]');
    expect(caixaDoGrafico.className).not.toContain('h-[200px]');
    expect(caixaDoGrafico.style.marginLeft).toBe('');
  });

  it('preserva o espaçamento interno e a coluna das legendas', async () => {
    renderizarPagina();
    const { legendas } = await localizarBloco();

    expect(legendas.className).toContain('flex-1');
    expect(legendas.className).toContain('min-w-0');
    expect(legendas.className).toContain('space-y-3');
    expect(legendas.children).toHaveLength(5);
  });

  it('mantém o título, as cinco fatias e os valores do cenário demonstrativo', async () => {
    renderizarPagina();
    const { legendas } = await localizarBloco();

    ['Férias + 1/3', '13º Salário', 'FGTS (8%)', 'Multa FGTS (40%)', 'INSS Patronal (20%)'].forEach(
      (fatia) => expect(within(legendas).getByText(fatia)).toBeInTheDocument(),
    );
    [/18\.500,00/, /49\.333,33/, /8\.420,00/, /3\.100,00/, /12\.650,00/].forEach((valor) =>
      expect(within(legendas).getByText(valor)).toBeInTheDocument(),
    );
    expect(screen.getByText('Composição do Passivo')).toBeInTheDocument();
  });
});
