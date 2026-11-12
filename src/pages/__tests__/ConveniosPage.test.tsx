import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConveniosPage from '@/pages/ConveniosPage';

const { updateSpy, eqSpy } = vi.hoisted(() => ({ updateSpy: vi.fn(), eqSpy: vi.fn() }));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/hooks', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));
vi.mock('@/integrations/supabase/client', () => {
  const rows: Record<string, unknown[]> = {
    convenios: [
      { id: 'cv-1', nome: 'Farmácia X', tipo: 'farmacia', limite_global: 500, ativo: true, empresa_id: 'emp-1' },
    ],
  };
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    const result = { data: rows[table] ?? [], error: null };
    b.select = () => b;
    b.order = () => b;
    b.eq = (...args: unknown[]) => {
      eqSpy(table, ...args);
      return b;
    };
    b.update = (payload: unknown) => {
      updateSpy(table, payload);
      return b;
    };
    b.then = (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve);
    return b;
  };
  return { supabase: { from: (t: string) => builder(t) } };
});

function renderPage(qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(
    <QueryClientProvider client={qc}>
      <ConveniosPage />
    </QueryClientProvider>
  );
}

describe('ConveniosPage — edição', () => {
  beforeEach(() => {
    updateSpy.mockClear();
    eqSpy.mockClear();
  });

  it('abre o diálogo preenchido e salva via update escopado por empresa', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(screen.getByText('Editar Convênio')).toBeInTheDocument();
    const nome = screen.getByDisplayValue('Farmácia X');
    expect(screen.getByDisplayValue('500')).toBeInTheDocument();

    fireEvent.change(nome, { target: { value: 'Farmácia Y' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith('convenios', {
        nome: 'Farmácia Y',
        tipo: 'farmacia',
        limite_global: 500,
        ativo: true,
      })
    );
    expect(eqSpy).toHaveBeenCalledWith('convenios', 'id', 'cv-1');
    expect(eqSpy).toHaveBeenCalledWith('convenios', 'empresa_id', 'emp-1');
  });

  it('após editar, invalida também a lista de colaboradores vinculados (nome do convênio)', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    renderPage(qc);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByDisplayValue('Farmácia X'), { target: { value: 'Farmácia Y' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['convenios-colaboradores'] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['convenios'] });
  });
});
