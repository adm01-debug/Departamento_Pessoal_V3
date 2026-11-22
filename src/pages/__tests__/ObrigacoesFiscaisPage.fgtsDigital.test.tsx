import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ObrigacoesFiscaisPage from '@/pages/ObrigacoesFiscaisPage';

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
      chain.then = (resolve: (v: unknown) => unknown) =>
        resolve({
          data:
            (globalThis as { __gfdRows?: unknown[] }).__gfdRows ?? (tabela === 'guias_fgts_digital' ? [guiaGfd] : []),
          error: (globalThis as { __gfdError?: unknown }).__gfdError ?? null,
        });
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
});
