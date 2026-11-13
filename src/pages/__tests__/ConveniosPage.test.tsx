import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConveniosPage from '@/pages/ConveniosPage';

const { updateSpy, eqSpy, deleteSpy, auth } = vi.hoisted(() => ({
  updateSpy: vi.fn(),
  eqSpy: vi.fn(),
  deleteSpy: vi.fn(),
  auth: { roles: ['rh'] as string[], semLinhas: false },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/hooks', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/contexts', () => ({
  useAuth: () => ({
    isAdmin: auth.roles.includes('admin'),
    hasRole: (r: string) => auth.roles.includes(r),
  }),
}));
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
      if (auth.semLinhas) result.data = [];
      return b;
    };
    b.delete = () => {
      deleteSpy(table);
      if (auth.semLinhas) result.data = [];
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
    deleteSpy.mockClear();
    auth.roles = ['rh'];
    auth.semLinhas = false;
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

  it('colaborador sem papel RH/admin não vê Editar nem Excluir', async () => {
    auth.roles = ['user'];
    renderPage();
    expect(await screen.findByText('Farmácia X')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo Convênio' })).not.toBeInTheDocument();
  });

  it('admin vê Editar e Excluir', async () => {
    auth.roles = ['admin'];
    renderPage();
    expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo Convênio' })).toBeInTheDocument();
  });

  it('update sem linha afetada mostra erro em vez de sucesso', async () => {
    const { toast } = await import('sonner');
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    auth.semLinhas = true;
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('delete sem linha afetada mostra erro em vez de sucesso', async () => {
    const { toast } = await import('sonner');
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    auth.semLinhas = true;
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('Excluir pede confirmação: cancelar não apaga, confirmar apaga escopado por empresa', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Excluir convênio?')).toBeInTheDocument();
    expect(deleteSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByText('Excluir convênio?')).not.toBeInTheDocument());
    expect(deleteSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith('convenios'));
    expect(eqSpy).toHaveBeenCalledWith('convenios', 'id', 'cv-1');
    expect(eqSpy).toHaveBeenCalledWith('convenios', 'empresa_id', 'emp-1');
  });
});
