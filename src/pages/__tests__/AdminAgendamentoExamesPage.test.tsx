import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import AdminAgendamentoExamesPage from '@/pages/AdminAgendamentoExamesPage';
import { supabase } from '@/integrations/supabase/client';
import { makeChain, type Chain } from '@/test/chain';
import { TEST_EMPRESA_ID } from '@/test/empresaMock';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('@/hooks/useEmpresas', async () => (await import('@/test/empresaMock')).useEmpresasMockModule());

const AGEND = {
  id: 'ag-1',
  colaborador_id: 'c-1',
  clinica_id: 'cl-1',
  tipo_exame: 'periodico',
  data_agendada: '2030-01-10T10:00:00Z',
  distancia_km: 3,
  status: 'agendado',
  observacoes: null,
  clinicas_partners: { razao_social: 'Clínica X', cidade: 'São Paulo', uf: 'SP' },
  colaboradores: { nome_completo: 'Maria Souza', matricula: '001' },
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminAgendamentoExamesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AdminAgendamentoExamesPage — ações por linha', () => {
  let updateChain: Chain;

  function mockFrom(updateResult: { data: unknown; error: unknown }) {
    const listChain = makeChain({ data: [AGEND], error: null });
    updateChain = makeChain(updateResult as never);
    vi.spyOn(supabase, 'from').mockImplementation((() => {
      // A listagem usa select(); a ação usa update() — devolvemos chains separados.
      return new Proxy(
        {},
        {
          get: (_t, prop) => (prop === 'update' ? updateChain.update : (listChain as never)[prop as string]),
        }
      );
    }) as never);
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it('marca como realizado filtrando por id e empresa', async () => {
    mockFrom({ data: [{ id: 'ag-1' }], error: null });
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Realizado/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Exame marcado como realizado'));
    expect(updateChain.update).toHaveBeenCalledWith({ status: 'realizado' });
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'ag-1');
    expect(updateChain.eq).toHaveBeenCalledWith('empresa_id', TEST_EMPRESA_ID);
  });

  it('remarca com a nova data e status reagendado', async () => {
    mockFrom({ data: [{ id: 'ag-1' }], error: null });
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Remarcar/i }));
    const confirmar = screen.getByRole('button', { name: /Confirmar remarcação/i });
    expect(confirmar).toBeDisabled();
    await user.type(screen.getByLabelText(/Nova data/i), '2030-02-01T09:30');
    await user.click(confirmar);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Exame remarcado'));
    expect(updateChain.update).toHaveBeenCalledWith({
      status: 'reagendado',
      data_agendada: new Date('2030-02-01T09:30').toISOString(),
    });
  });

  it('acusa erro quando o UPDATE não afeta nenhuma linha (RLS/registro inexistente)', async () => {
    mockFrom({ data: [], error: null });
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /^Cancelar$/i }));
    await user.click(screen.getByRole('button', { name: /Confirmar cancelamento/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(updateChain.update).toHaveBeenCalledWith({ status: 'cancelado' });
    expect(toast.success).not.toHaveBeenCalled();
  });
});
