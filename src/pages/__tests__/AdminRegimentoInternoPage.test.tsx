import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminRegimentoInternoPage from '@/pages/AdminRegimentoInternoPage';

const h = vi.hoisted(() => {
  const updates: Array<{ payload: unknown; filtros: Array<[string, unknown]> }> = [];
  const state = { documentos: [] as unknown[] };
  const from = vi.fn(() => ({
    select: () => ({
      eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: state.documentos, error: null }) }) }),
    }),
    update: (payload: unknown) => {
      const filtros: Array<[string, unknown]> = [];
      updates.push({ payload, filtros });
      const chain = {
        eq: (col: string, val: unknown) => {
          filtros.push([col, val]);
          return chain;
        },
        select: () => Promise.resolve({ data: [{ id: 'x' }], error: null }),
      };
      return chain;
    },
  }));
  const rpc = vi.fn((nome: string) =>
    Promise.resolve({
      data: nome === 'sst_regimento_dashboard' ? { documento: null, total_colaboradores: 0 } : [],
      error: null,
    })
  );
  return { updates, state, from, rpc };
});

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/hooks/usePiiMask', () => ({ usePiiMask: () => ({ email: (e: string) => e }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: h.from, rpc: h.rpc } }));

const doc = (id: string, versao: number, status: string) => ({
  id,
  titulo: `Regimento v${versao}`,
  conteudo_html: `<p>conteúdo ${versao}</p>`,
  versao,
  status,
  hash_sha256: status === 'RASCUNHO' ? null : 'abcdef0123456789',
  publicado_em: null,
  created_at: '2026-11-01T10:00:00Z',
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AdminRegimentoInternoPage />
    </QueryClientProvider>
  );
}

describe('AdminRegimentoInternoPage — editar rascunho e arquivar publicado', () => {
  beforeEach(() => {
    h.updates.length = 0;
    h.state.documentos = [doc('d2', 2, 'RASCUNHO'), doc('d1', 1, 'PUBLICADO'), doc('d0', 0, 'ARQUIVADO')];
  });

  it('mostra Editar só no rascunho e Arquivar só no publicado', async () => {
    renderPage();
    await screen.findByText('Regimento v2');
    expect(screen.getAllByRole('button', { name: /Editar/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Arquivar/ })).toHaveLength(1);
  });

  it('salva a edição do rascunho restrita a status RASCUNHO da empresa', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Regimento v2');
    await user.click(screen.getByRole('button', { name: /Editar/ }));
    const titulo = screen.getByLabelText('Título do rascunho');
    await user.clear(titulo);
    await user.type(titulo, 'Regimento revisado');
    await user.click(screen.getByRole('button', { name: /Salvar alterações/ }));

    await waitFor(() => expect(h.updates).toHaveLength(1));
    expect(h.updates[0].payload).toEqual({ titulo: 'Regimento revisado', conteudo_html: '<p>conteúdo 2</p>' });
    expect(h.updates[0].filtros).toEqual([
      ['id', 'd2'],
      ['empresa_id', 'emp-1'],
      ['status', 'RASCUNHO'],
    ]);
  });

  it('arquiva o publicado após confirmação', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Regimento v1');
    await user.click(screen.getByRole('button', { name: /Arquivar/ }));
    const dialogo = await screen.findByRole('alertdialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Arquivar' }));

    await waitFor(() => expect(h.updates).toHaveLength(1));
    expect(h.updates[0].payload).toEqual({ status: 'ARQUIVADO' });
    expect(h.updates[0].filtros).toEqual([
      ['id', 'd1'],
      ['empresa_id', 'emp-1'],
      ['status', 'PUBLICADO'],
    ]);
  });
});
