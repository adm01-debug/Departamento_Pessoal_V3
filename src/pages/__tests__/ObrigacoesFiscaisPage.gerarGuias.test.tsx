import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import ObrigacoesFiscaisPage from '@/pages/ObrigacoesFiscaisPage';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('@/hooks', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/services/edgeFunctionsService', () => ({
  edgeFunctionsService: { gerarGuias: vi.fn() },
}));
vi.mock('@/integrations/supabase/client', () => {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'insert', 'update']) chain[m] = () => chain;
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
  return { supabase: { from: () => chain } };
});

const gerarGuias = vi.mocked(edgeFunctionsService.gerarGuias);

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

describe('ObrigacoesFiscaisPage — gerar guias via servidor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra quantas guias foram geradas', async () => {
    gerarGuias.mockResolvedValue({ success: true, guias: [{}, {}], duplicatas_bloqueadas: [] } as never);
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', { name: /Auto/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2 guia(s) gerada(s)'));
    expect(gerarGuias).toHaveBeenCalledWith(expect.objectContaining({ empresaId: 'emp-1', tipo: 'todos' }));
  });

  it('não anuncia sucesso quando tudo já existia: informa as duplicatas', async () => {
    gerarGuias.mockResolvedValue({
      success: true,
      guias: [],
      duplicatas_bloqueadas: ['GPS', 'FGTS_DIGITAL'],
    } as never);
    renderPage();
    await userEvent.setup().click(screen.getByRole('button', { name: /Auto/i }));
    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith('Nenhuma guia nova; já existentes nesta competência: GPS, FGTS_DIGITAL')
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});
