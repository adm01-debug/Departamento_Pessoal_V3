import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminExtintoresPage from '@/pages/AdminExtintoresPage';

const { updateMock, eqCalls } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  eqCalls: [] as Array<[string, unknown]>,
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/integrations/supabase/client', () => {
  const extintor = {
    id: 'ext-1',
    codigo_patrimonio: 'EXT-001',
    tipo: 'CO2',
    capacidade_kg: 6,
    localizacao: 'Recepção',
    data_proxima_recarga: '2027-01-10',
    data_proximo_teste_hidrostatico: '2028-01-10',
    status: 'ATIVO',
    qr_code: 'EXT-abc123',
  };
  const listChain = {
    select: () => listChain,
    eq: () => listChain,
    is: () => listChain,
    order: () => listChain,
    limit: () => Promise.resolve({ data: [extintor], error: null }),
  };
  const updateChain = {
    eq: (col: string, val: unknown) => {
      eqCalls.push([col, val]);
      return eqCalls.length % 2 === 0 ? Promise.resolve({ error: null }) : updateChain;
    },
  };
  return {
    supabase: {
      rpc: () => Promise.resolve({ data: { total: 1 }, error: null }),
      from: () => ({
        ...listChain,
        update: (payload: unknown) => {
          updateMock(payload);
          return updateChain;
        },
      }),
    },
  };
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AdminExtintoresPage />
    </QueryClientProvider>
  );
}

describe('AdminExtintoresPage — editar e excluir', () => {
  beforeEach(() => {
    updateMock.mockClear();
    eqCalls.length = 0;
  });

  it('edita localização do extintor existente', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar EXT-001' }));
    expect(await screen.findByText('Editar Extintor')).toBeInTheDocument();
    const local = screen.getByDisplayValue('Recepção');
    fireEvent.change(local, { target: { value: 'Almoxarifado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ localizacao: 'Almoxarifado', codigo_patrimonio: 'EXT-001', status: 'ATIVO' })
    );
    expect(eqCalls).toEqual([
      ['id', 'ext-1'],
      ['empresa_id', 'emp-1'],
    ]);
  });

  it('só exclui (soft delete) após confirmação', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir EXT-001' }));
    expect(await screen.findByText('Excluir extintor EXT-001?')).toBeInTheDocument();
    expect(updateMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(payload)).toEqual(['deleted_at']);
    expect(typeof payload.deleted_at).toBe('string');
    expect(eqCalls).toEqual([
      ['id', 'ext-1'],
      ['empresa_id', 'emp-1'],
    ]);
  });
});
