import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ValesPage from '@/pages/ValesPage';

const { toastError, updateMock, state } = vi.hoisted(() => ({
  toastError: vi.fn(),
  updateMock: vi.fn(),
  state: { vtAtivoExistente: [] as { id: string }[] },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError } }));
vi.mock('@/hooks', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'empresa-1' } }) }));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));

const VT = {
  id: 'vt-1',
  colaborador_id: 'colab-1',
  optante: true,
  valor_diario: 35.7,
  dias_uteis: 22,
  valor_mensal: 785.4,
  desconto: 0,
  valor_liquido: 0,
  colaborador: { nome_completo: 'Maria Souza', empresa_id: 'empresa-1' },
};

vi.mock('@/integrations/supabase/client', () => {
  const builder = (table: string) => {
    let data: unknown = [];
    if (table === 'vales_transporte') data = [VT];
    if (table === 'colaboradores') data = [{ id: 'colab-1', nome_completo: 'Maria Souza' }];
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'order', 'eq', 'neq', 'insert', 'delete', 'maybeSingle']) b[m] = () => b;
    b.limit = () => {
      data = state.vtAtivoExistente;
      return b;
    };
    b.update = (payload: unknown) => {
      updateMock(payload);
      data = null;
      return b;
    };
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data, error: null });
    return b;
  };
  return { supabase: { from: (table: string) => builder(table) } };
});

async function editarVT() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ValesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('tab', { name: /VT/ }));
  await user.click(await screen.findByRole('button', { name: 'Editar VT' }));
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
}

describe('ValesPage — VT', () => {
  beforeEach(() => {
    toastError.mockReset();
    updateMock.mockReset();
  });

  it('bloqueia um segundo VT ativo para o mesmo colaborador', async () => {
    state.vtAtivoExistente = [{ id: 'vt-2' }];
    await editarVT();
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringContaining('já possui um VT ativo')));
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('arredonda valor_mensal em centavos (35,70 × 22 = 785,40)', async () => {
    state.vtAtivoExistente = [];
    await editarVT();
    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    expect(updateMock.mock.calls[0][0]).toMatchObject({ valor_mensal: 785.4 });
  });
});
