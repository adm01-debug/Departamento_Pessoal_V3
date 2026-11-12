import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PlanosSaudePage from '@/pages/PlanosSaudePage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'empresa-1' } }) }));
vi.mock('@/hooks/usePiiMask', () => ({ usePiiMask: () => ({ mask: (v: string) => v }) }));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));

const PLANO = {
  id: 'plano-1',
  empresa_id: 'empresa-1',
  operadora: 'Unimed',
  tipo_plano: 'saude',
  valor_mensal: 450,
  percentual_colaborador: 20,
  ans_registro: '123456',
  numero_carteirinha: null,
};

vi.mock('@/integrations/supabase/client', () => {
  const builder = (table: string) => {
    const result = { data: table === 'planos_saude' ? [PLANO] : [], error: null };
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'order', 'eq', 'update', 'insert', 'delete', 'maybeSingle']) b[m] = () => b;
    b.then = (resolve: (v: typeof result) => unknown) => resolve(result);
    return b;
  };
  return { supabase: { from: (table: string) => builder(table) } };
});

describe('PlanosSaudePage', () => {
  it('"Novo Plano" abre formulário limpo depois de salvar uma edição', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <PlanosSaudePage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Editar plano' }));
    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByDisplayValue('Unimed')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Novo Plano/i }));
    dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Cadastrar Plano')).toBeInTheDocument();
    expect(within(dialog).queryByDisplayValue('Unimed')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });
});
