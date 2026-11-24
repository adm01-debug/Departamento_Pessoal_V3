import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * CARD "COMPLIANCE ESOCIAL" (aba "Análise Detalhada") — GEOMETRIA DO ANEL.
 *
 * Trava a correção do conteúdo do gráfico:
 *   1. o gráfico e os textos ficam num ÚNICO container em coluna
 *      (`flex flex-col items-center justify-center relative`);
 *   2. a caixa que ancora a porcentagem tem EXATAMENTE o lado do SVG (96 px,
 *      cravado em `style` inline). Isso é essencial porque `h-24`/`w-24` são
 *      6rem e a base do `<html>` é 125% (20 px) = 120 px: com a caixa maior
 *      que o desenho, o centro do texto caía ~12 px fora do centro do círculo;
 *   3. o "98%" usa `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` sobre
 *      essa caixa → centro matemático (o círculo é desenhado em cx/cy = 48);
 *   4. o rótulo "Aceitação" + ícone (i) fica FORA da caixa do anel, colado na
 *      borda inferior do círculo (`mt-1` = 0,25rem = 5 px na base de 20 px) e
 *      centralizado no mesmo eixo (`w-full` + `justify-center` + `text-center`);
 *   5. a listagem lateral (cores e valores) e a animação do anel continuam
 *      intactas — só a posição dos textos do centro mudou.
 */

// Hooks reais da página devolvem "sem loading": o card de compliance usa mocks
// estáticos (MOCK_COMPLIANCE_ESOCIAL) e não depende dessas requisições, mas a
// página inteira é renderizada neste teste.
vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtualId: 'empresa-teste', loadingEmpresas: false }),
}));

vi.mock('@/hooks/useDepartamentos', () => ({
  useDepartamentos: () => ({ departamentos: [], isLoading: false }),
}));

vi.mock('@/hooks/useCargos', () => ({
  useCargos: () => ({ cargos: [], isLoading: false }),
}));

vi.mock('@/hooks/useColaboradores', () => ({
  useColaboradores: () => ({ colaboradores: [], isLoading: false, isLoadingSummary: false }),
}));

vi.mock('@/hooks/useExecutiveDashboard', () => ({
  useExecutiveKPIs: () => ({ data: undefined, isLoading: false, refetch: vi.fn() }),
  useStrategicFinancials: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('@/hooks/useRealTimeSubscription', () => ({
  useRealTimeSubscription: vi.fn(),
}));

import DashboardExecutivoPage from '../DashboardExecutivoPage';

function renderizarNaAbaAnalitica() {
  const resultado = render(
    <MemoryRouter>
      <DashboardExecutivoPage />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('tab', { name: /Análise Detalhada/i }));
  return resultado;
}

/** Caixa que ancora a porcentagem: pai direto do "98%". */
function caixaDoAnel(): HTMLElement {
  return screen.getByText('98%').parentElement as HTMLElement;
}

describe('Dashboard Executivo — rosca do card "Compliance eSocial"', () => {
  it('centraliza o "98%" no centro matemático do círculo (eixos X e Y)', () => {
    renderizarNaAbaAnalitica();

    const valor = screen.getByText('98%');

    // Ancoragem absoluta no centro da caixa + translate de -50% nos dois eixos:
    // o centro do texto cai sobre (left 50%, top 50%) da caixa do anel.
    expect(valor.className).toContain('absolute');
    expect(valor.className).toContain('left-1/2');
    expect(valor.className).toContain('top-1/2');
    expect(valor.className).toContain('-translate-x-1/2');
    expect(valor.className).toContain('-translate-y-1/2');
    // Nada de quebra de linha/entrelinha empurrando o número.
    expect(valor.className).toContain('whitespace-nowrap');
    expect(valor.className).toContain('leading-none');
    expect(valor.textContent).toBe('98%');

    // A caixa tem o MESMO lado do SVG, em px absoluto (imune à base rem de
    // 125% do `<html>`, que faz `h-24` valer 120 px). Sem essa igualdade o
    // "98%" sai do centro.
    const caixa = caixaDoAnel();
    const svg = caixa.querySelector('svg') as SVGSVGElement;
    expect(svg).not.toBeNull();
    expect(caixa.style.width).toBe('96px');
    expect(caixa.style.height).toBe('96px');
    expect(svg.getAttribute('width')).toBe('96');
    expect(svg.getAttribute('height')).toBe('96');
    // `block` no SVG elimina o espaço de linha (baseline) abaixo do desenho,
    // que empurrava qualquer irmão posicionado em fluxo.
    expect(svg.getAttribute('class')).toContain('block');
  });

  it('cola o rótulo "Aceitação" abaixo do anel e centra texto + ícone no eixo', () => {
    renderizarNaAbaAnalitica();

    const legenda = screen.getByText('Aceitação');
    const caixa = caixaDoAnel();
    const coluna = caixa.parentElement as HTMLElement;

    // Fora da caixa do gráfico: o rótulo não encosta mais na rosca.
    expect(caixa.contains(legenda)).toBe(false);
    // Irmão imediatamente ABAIXO do anel, no container único do gráfico.
    expect(legenda.parentElement).toBe(coluna);
    expect(caixa.nextElementSibling).toBe(legenda);

    // Container único em coluna, centralizado nos dois eixos.
    expect(coluna.className).toContain('flex-col');
    expect(coluna.className).toContain('items-center');
    expect(coluna.className).toContain('justify-center');
    expect(coluna.className).toContain('relative');

    // Respiro curto (mt-1 = 0,25rem = 5 px com a base de 20 px, faixa 4–6 px) e
    // centralização: a coluna tem a largura do anel, então `w-full` +
    // `justify-center` + `text-center` colocam o grupo no eixo do círculo.
    expect(legenda.className).toContain('mt-1');
    expect(legenda.className).not.toContain('mt-2');
    expect(legenda.className).toContain('w-full');
    expect(legenda.className).toContain('items-center');
    expect(legenda.className).toContain('justify-center');
    expect(legenda.className).toContain('text-center');
    expect(coluna.style.width).toBe('96px');

    // O ícone (i) fica DENTRO da legenda, acompanhando o texto centralizado.
    expect(legenda.querySelector('button')).not.toBeNull();
  });

  it('preserva a listagem lateral (valores e ordem) e o total de eventos', () => {
    renderizarNaAbaAnalitica();

    // Escopo restrito à `<ul>` do card: a página tem outros números soltos
    // (KPIs, pendências) que colidiriam com um `getByText` global.
    const lista = screen.getByText('Processados').closest('ul') as HTMLElement;
    expect(lista).not.toBeNull();

    const linhas = Array.from(lista.querySelectorAll('li')).map((li) => li.textContent);
    expect(linhas).toEqual(['Processados148', 'Rejeitados2', 'Pendentes0', 'Total150']);
    ['Processados', 'Rejeitados', 'Pendentes', 'Total'].forEach((rotulo) => {
      expect(within(lista).getByText(rotulo)).toBeInTheDocument();
    });
  });
});
