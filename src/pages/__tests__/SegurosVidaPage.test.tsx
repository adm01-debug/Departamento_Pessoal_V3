import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import SegurosVidaPage from '@/pages/SegurosVidaPage';

type Call = { table: string; op: string; args: unknown[] };
const calls: Call[] = [];
let updateRows: Array<{ id: string }> = [{ id: 'seg-1' }];
let roles: string[] = ['rh'];

const seguro = {
  id: 'seg-1',
  empresa_id: 'emp-1',
  seguradora: 'Seguradora A',
  numero_apolice: 'AP-1',
  capital_segurado: 50000,
  premio_mensal: 120.5,
  data_inicio: '2026-01-01',
  data_fim: '2026-12-31',
  created_at: '2026-01-01T00:00:00Z',
};

function builder(table: string) {
  let op = 'select';
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'eq', 'insert', 'update', 'delete']) {
    b[m] = (...args: unknown[]) => {
      if (['insert', 'update', 'delete'].includes(m)) op = m;
      calls.push({ table, op: m, args });
      return b;
    };
  }
  b.then = (resolve: (v: unknown) => void) => {
    if (op === 'update') return resolve({ data: updateRows, error: null });
    if (table === 'seguros_vida' && op === 'select') return resolve({ data: [seguro], error: null });
    return resolve({ data: [], error: null });
  };
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (t: string) => builder(t) } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/hooks', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/contexts', () => ({
  useAuth: () => ({ isAdmin: roles.includes('admin'), hasRole: (r: string) => roles.includes(r) }),
}));
vi.mock('@/hooks/usePiiMask', () => ({ usePiiMask: () => ({ cpf: (v: string) => v }) }));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));
vi.mock('@/services/tabelasComplementaresService', () => ({
  beneficiariosSeguroService: { listar: vi.fn().mockResolvedValue([]), criar: vi.fn() },
  segurosColaboradoresService: { listar: vi.fn().mockResolvedValue([]), vincular: vi.fn(), desvincular: vi.fn() },
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SegurosVidaPage />
    </QueryClientProvider>
  );
}

describe('SegurosVidaPage — editar apólice', () => {
  beforeEach(() => {
    calls.length = 0;
    updateRows = [{ id: 'seg-1' }];
    roles = ['rh'];
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it('abre o formulário preenchido e grava UPDATE filtrado por id e empresa', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar seguro' }));

    expect(screen.getByText('Editar Seguro de Vida')).toBeInTheDocument();
    const seguradora = screen.getByDisplayValue('Seguradora A');
    expect(screen.getByDisplayValue('AP-1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50000')).toBeInTheDocument();

    fireEvent.change(seguradora, { target: { value: 'Seguradora B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Seguro atualizado'));
    const upd = calls.find((c) => c.table === 'seguros_vida' && c.op === 'update');
    expect(upd?.args[0]).toEqual({
      seguradora: 'Seguradora B',
      numero_apolice: 'AP-1',
      capital_segurado: 50000,
      premio_mensal: 120.5,
      data_inicio: '2026-01-01',
      data_fim: '2026-12-31',
    });
    const idx = calls.indexOf(upd!);
    const eqs = calls.slice(idx + 1, idx + 3).map((c) => c.args);
    expect(eqs).toEqual([
      ['id', 'seg-1'],
      ['empresa_id', 'emp-1'],
    ]);
    expect(calls.some((c) => c.table === 'seguros_vida' && c.op === 'insert')).toBe(false);
  });

  it('recarrega os sinistros após editar (nome da seguradora exibido na aba Sinistros)', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar seguro' }));
    const sinistroSelects = () => calls.filter((c) => c.table === 'sinistros_seguro' && c.op === 'select').length;
    const antes = sinistroSelects();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Seguro atualizado'));
    await waitFor(() => expect(sinistroSelects()).toBeGreaterThan(antes));
  });

  it('mostra erro quando o UPDATE não altera nenhuma linha (RLS/registro inexistente)', async () => {
    updateRows = [];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar seguro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('SegurosVidaPage — excluir e permissões', () => {
  beforeEach(() => {
    calls.length = 0;
    roles = ['rh'];
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it('pede confirmação antes de excluir e não apaga ao cancelar', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir seguro' }));

    expect(screen.getByText('Excluir seguro de vida?')).toBeInTheDocument();
    expect(screen.getByText(/sinistros, beneficiários e colaboradores vinculados/)).toBeInTheDocument();
    expect(calls.some((c) => c.op === 'delete')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByText('Excluir seguro de vida?')).not.toBeInTheDocument());
    expect(calls.some((c) => c.op === 'delete')).toBe(false);
  });

  it('exclui filtrando por id e empresa só depois de confirmar', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir seguro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Excluído'));
    const del = calls.find((c) => c.table === 'seguros_vida' && c.op === 'delete');
    expect(del).toBeDefined();
    const idx = calls.indexOf(del!);
    expect(calls.slice(idx + 1, idx + 3).map((c) => c.args)).toEqual([
      ['id', 'seg-1'],
      ['empresa_id', 'emp-1'],
    ]);
  });

  it('admin também vê Editar e Excluir', async () => {
    roles = ['admin'];
    renderPage();
    expect(await screen.findByRole('button', { name: 'Editar seguro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir seguro' })).toBeInTheDocument();
  });

  it('usuário sem papel RH/admin não vê Editar nem Excluir', async () => {
    roles = ['user'];
    renderPage();
    expect(await screen.findByText('Seguradora A')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar seguro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir seguro' })).not.toBeInTheDocument();
  });
});
