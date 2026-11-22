import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ObrigacoesFiscaisPage from '@/pages/ObrigacoesFiscaisPage';

// Radix Select depende de APIs de ponteiro que o jsdom não implementa; sem
// isso o dropdown nunca abre e o teste de troca de competência não roda.
beforeAll(() => {
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  });
});

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
vi.mock('@/hooks', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/services/edgeFunctionsService', () => ({
  edgeFunctionsService: { gerarGuias: vi.fn(), gerarGuiaFgtsDigital: vi.fn() },
}));

// A guia GFD vem de `guias_fgts_digital`; as demais tabelas respondem vazio.
// Sem essa distinção o teste não prova que a aba lê a tabela certa (a órfã).
const guiaGfd = {
  id: 'gfd-1',
  competencia: '2026-11',
  tipo: 'mensal',
  valor_total: 1234.56,
  vencimento: '2026-12-20',
  status: 'gerada',
  gfd_protocolo: 'FGD-1763779200000-abcdef12',
  gfd_data_geracao: '2026-11-22T03:00:00Z',
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => {
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'order', 'insert', 'update']) chain[m] = () => chain;
      chain.then = (resolve: (v: unknown) => unknown) => {
        const byTable = (globalThis as { __rowsByTable?: Record<string, unknown[]> }).__rowsByTable;
        const rows = byTable?.[tabela] ?? (tabela === 'guias_fgts_digital' ? [guiaGfd] : []);
        return resolve({
          data: (globalThis as { __gfdRows?: unknown[] }).__gfdRows ?? rows,
          error: (globalThis as { __gfdError?: unknown }).__gfdError ?? null,
        });
      };
      return chain;
    },
  },
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ObrigacoesFiscaisPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ObrigacoesFiscaisPage — aba FGTS Digital (edge fgts-digital)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as { __gfdRows?: unknown[] }).__gfdRows;
    delete (globalThis as { __gfdError?: unknown }).__gfdError;
    delete (globalThis as { __rowsByTable?: Record<string, unknown[]> }).__rowsByTable;
  });

  it('expõe a aba FGTS Digital', async () => {
    renderPage();
    expect(await screen.findByRole('tab', { name: /FGTS Digital/i })).toBeInTheDocument();
  });

  it('lê e exibe as guias de guias_fgts_digital com o protocolo GFD', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('tab', { name: /FGTS Digital/i }));
    // O protocolo é renderizado truncado; a competência e o tipo identificam a linha.
    await waitFor(() => expect(screen.getByText('2026-11')).toBeInTheDocument());
    expect(screen.getByText('FGD-17637792')).toBeInTheDocument();
    expect(screen.getByText('Gerada')).toBeInTheDocument();
  });

  it('mostra estado de erro em vez de lista vazia quando a leitura falha', async () => {
    (globalThis as { __gfdError?: unknown }).__gfdError = { message: 'permission denied' };
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('tab', { name: /FGTS Digital/i }));
    await waitFor(() => expect(screen.getByText(/Falha ao carregar as guias FGTS Digital/i)).toBeInTheDocument());
    // A mensagem de "nenhuma guia" mentiria sobre o estado real.
    expect(screen.queryByText(/Nenhuma guia FGTS Digital emitida/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument();
  });

  it('recupera a lista ao clicar em "Tentar novamente" depois de uma falha', async () => {
    (globalThis as { __gfdError?: unknown }).__gfdError = { message: 'permission denied' };
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('tab', { name: /FGTS Digital/i }));
    await waitFor(() => expect(screen.getByText(/Falha ao carregar as guias FGTS Digital/i)).toBeInTheDocument());

    // A leitura volta a funcionar; o botão precisa refazer a query, não só limpar o erro.
    delete (globalThis as { __gfdError?: unknown }).__gfdError;
    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    await waitFor(() => expect(screen.getByText('FGD-17637792')).toBeInTheDocument());
    expect(screen.queryByText(/Falha ao carregar as guias FGTS Digital/i)).not.toBeInTheDocument();
  });

  it('soma no diálogo apenas as guias da competência selecionada, não o histórico', async () => {
    // Relógio fixo: a competência inicial da tela é o mês seguinte ao atual
    // (12/2026), então a guia de 2026-11 não pode entrar no total do diálogo.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));
    (globalThis as { __rowsByTable?: Record<string, unknown[]> }).__rowsByTable = {
      guias_fgts: [
        { id: 'f-11', competencia: '2026-11', valor_total: 500, status: 'paga', data_vencimento: '2026-12-07' },
        { id: 'f-12', competencia: '2026-12', valor_total: 800, status: 'pendente', data_vencimento: '2027-01-07' },
      ],
    };
    try {
      renderPage();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.click(await screen.findByRole('tab', { name: /FGTS Digital/i }));
      await user.click(screen.getByRole('button', { name: /Registrar guia GFD/i }));

      await waitFor(() =>
        expect(screen.getByText(/Total de FGTS apurado em 12\/2026:.*800,00 em guias FGTS\./)).toBeInTheDocument()
      );
      // Regressão: se o filtro voltar a comparar MM/AAAA com AAAA-MM, o diálogo
      // cai em "Sem guias FGTS apuradas" e sugere digitar um valor que existe.
      expect(screen.queryByText(/Sem guias FGTS apuradas/i)).not.toBeInTheDocument();
      // 500 (2026-11) + 800 (2026-12) = 1.300 seria o total histórico.
      expect(screen.queryByText(/1\.300,00 em guias FGTS\./)).not.toBeInTheDocument();
      // 500 + 800 seria o total histórico; se aparecer, o filtro está quebrado.
      expect(screen.queryByText(/13,00 em guias FGTS\./)).not.toBeInTheDocument();

      // Trocar o seletor precisa mover o total junto: 11/2026 → R$ 500.
      // Sem isso o teste só cobre a competência de abertura e não prova que o
      // diálogo acompanha o seletor (thread ANALYSIS ...0001 da PR #822).
      // O diálogo modal torna o resto da página inacessível, então fecha antes.
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(screen.getAllByRole('combobox')[0]);
      await user.click(await screen.findByText('11/2026'));
      await user.click(screen.getByRole('button', { name: /Registrar guia GFD/i }));

      await waitFor(() =>
        expect(screen.getByText(/Total de FGTS apurado em 11\/2026:.*500,00 em guias FGTS\./)).toBeInTheDocument()
      );
      expect(screen.queryByText(/Total de FGTS apurado em 11\/2026:.*800,00/)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
