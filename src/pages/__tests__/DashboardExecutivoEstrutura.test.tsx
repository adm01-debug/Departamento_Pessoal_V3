import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * CICLO DE VIDA da aba "Estrutura" (`/dashboard-executivo`) — RENDERIZAÇÃO
 * CONDICIONAL ESTRITA em DUAS ETAPAS.
 *
 * O que este teste trava:
 *   1. os cards animados da aba (Mapa da Estrutura, rosca e legendas do Tipo de
 *      Vínculo) NÃO EXISTEM no DOM enquanto a aba não é aberta — logo, nada
 *      anima "antes da hora", em outra aba;
 *   2. ao abrir, o bloco só aparece depois do FIM DA ENTRADA do card (fade +
 *      subida da régua global) e com os dados na mão: 5 estatísticas do Mapa,
 *      arco (SVG com `<circle>`) e as 5 legendas. Por isso as asserções de
 *      presença são `await` (a montagem acontece no render seguinte ao
 *      `onAnimationComplete` do card — ou, no limite, na rede de segurança do
 *      hook `useEntradaCardConcluida`);
 *   3. durante as requisições, o portão de dados continua fechado: só skeleton.
 */

/**
 * Estado CONTROLÁVEL das requisições reais da aba "Estrutura": `useDepartamentos`,
 * `useCargos` e `useColaboradores` (as fontes de Departamentos, Cargos e do
 * quadro de onde saem Times/Vínculos). O teste liga/desliga o loading para
 * provar que o DOM bloqueia o conteúdo animado.
 */
const requisicoesEstrutura = vi.hoisted(() => ({ carregando: false }));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtualId: 'empresa-teste', loadingEmpresas: requisicoesEstrutura.carregando }),
}));

vi.mock('@/hooks/useDepartamentos', () => ({
  useDepartamentos: () => ({ departamentos: [], isLoading: requisicoesEstrutura.carregando }),
}));

vi.mock('@/hooks/useCargos', () => ({
  useCargos: () => ({ cargos: [], isLoading: requisicoesEstrutura.carregando }),
}));

vi.mock('@/hooks/useColaboradores', () => ({
  useColaboradores: () => ({
    colaboradores: [],
    isLoading: requisicoesEstrutura.carregando,
    isLoadingSummary: requisicoesEstrutura.carregando,
  }),
}));

// A página roda em modo demonstrativo (`USE_MOCK_DATA = true`), mas os hooks
// continuam sendo chamados: devolvem "sem loading" para o portão abrir junto
// com a montagem do painel.
vi.mock('@/hooks/useExecutiveDashboard', () => ({
  useExecutiveKPIs: () => ({ data: undefined, isLoading: false, refetch: vi.fn() }),
  useStrategicFinancials: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('@/hooks/useRealTimeSubscription', () => ({
  useRealTimeSubscription: vi.fn(),
}));

import DashboardExecutivoPage from '../DashboardExecutivoPage';

function renderizarPagina() {
  return render(
    <MemoryRouter>
      <DashboardExecutivoPage />
    </MemoryRouter>,
  );
}

describe('Dashboard Executivo — aba Estrutura (ciclo de vida)', () => {
  beforeEach(() => {
    requisicoesEstrutura.carregando = false;
  });

  afterEach(() => {
    requisicoesEstrutura.carregando = false;
  });

  it('não monta o conteúdo animado da aba antes de ela ser aberta', () => {
    const { container } = renderizarPagina();

    expect(screen.queryByText('Mapa da Estrutura')).toBeNull();
    expect(screen.queryByText('Tipo de Vínculo')).toBeNull();
    expect(screen.queryByText('CLT')).toBeNull();
    // A rosca do "Tipo de Vínculo" é o único SVG de 104px da página (a aba
    // ativa por padrão é "Evolução", que tem outros gráficos).
    expect(container.querySelector('svg[width="104"]')).toBeNull();
  });

  it('ao abrir a aba monta as 5 estatísticas do Mapa com os valores reais', async () => {
    renderizarPagina();

    fireEvent.click(screen.getByRole('tab', { name: /Estrutura/i }));

    // O conteúdo só é montado depois que a entrada do card termina.
    expect(
      await screen.findByText('Departamentos', undefined, { timeout: 6000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Mapa da Estrutura')).toBeInTheDocument();
    expect(screen.getByText('Times')).toBeInTheDocument();
    expect(screen.getByText('Cargos')).toBeInTheDocument();
    expect(screen.getByText('Lideranças')).toBeInTheDocument();
    expect(screen.getByText('Níveis hierárquicos')).toBeInTheDocument();
  });

  it('ao abrir a aba monta a rosca e as 5 legendas do Tipo de Vínculo', async () => {
    const { container } = renderizarPagina();

    fireEvent.click(screen.getByRole('tab', { name: /Estrutura/i }));

    expect(await screen.findByText('CLT', undefined, { timeout: 6000 })).toBeInTheDocument();
    expect(screen.getByText('Tipo de Vínculo')).toBeInTheDocument();
    // O arco só existe depois da montagem do bloco condicional.
    expect(container.querySelector('svg[width="104"]')).toBeInTheDocument();

    const legenda = screen.getByText('Tipo de Vínculo').closest('div')?.parentElement?.parentElement;
    ['CLT', 'PJ', 'Estágio', 'Aprendiz', 'Temporário'].forEach((nome) => {
      expect(within(legenda as HTMLElement).getByText(nome)).toBeInTheDocument();
    });
  });

  it('com as requisições em andamento a aba mostra SÓ o skeleton (nada animado no DOM)', () => {
    requisicoesEstrutura.carregando = true;
    const { container } = renderizarPagina();

    fireEvent.click(screen.getByRole('tab', { name: /Estrutura/i }));

    // As cascas dos dois cards existem (título/ícone continuam visíveis)…
    expect(screen.getByText('Mapa da Estrutura')).toBeInTheDocument();
    expect(screen.getByText('Tipo de Vínculo')).toBeInTheDocument();
    // …mas NENHUM dado, gráfico ou legenda foi montado.
    expect(screen.queryByText('Departamentos')).toBeNull();
    expect(screen.queryByText('Lideranças')).toBeNull();
    expect(screen.queryByText('CLT')).toBeNull();
    expect(container.querySelector('svg[width="104"]')).toBeNull();
    // Placeholders do loading no lugar das estatísticas e das legendas.
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(5);
  });

  it('quando as requisições terminam, o conteúdo animado é MONTADO do zero', async () => {
    requisicoesEstrutura.carregando = true;
    const { container, rerender } = renderizarPagina();

    fireEvent.click(screen.getByRole('tab', { name: /Estrutura/i }));
    expect(screen.queryByText('CLT')).toBeNull();
    expect(container.querySelector('svg[width="104"]')).toBeNull();

    // Fim das requisições: o portão de dados abre; a montagem acontece no fim
    // da entrada de cada card (slot 0 entra antes do slot 3).
    requisicoesEstrutura.carregando = false;
    rerender(
      <MemoryRouter>
        <DashboardExecutivoPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Departamentos', undefined, { timeout: 6000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText('CLT', undefined, { timeout: 6000 })).toBeInTheDocument();
    expect(container.querySelector('svg[width="104"]')).toBeInTheDocument();
    expect(screen.getByText('Temporário')).toBeInTheDocument();
  });
});
