import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import PensoesPage from '@/pages/PensoesPage';
import { createQueryBuilder, type ChainableQuery } from '@/test/supabaseMock';

const builders: { table: string; q: ChainableQuery }[] = [];
let updateResult: { data: null; error: { message: string } | null } = { data: null, error: null };

const pensao = {
  id: 'pen-1',
  colaborador_id: 'col-1',
  beneficiario: 'Maria Souza',
  cpf_beneficiario: '12345678909',
  tipo: 'judicial',
  percentual: 30,
  valor_fixo: null,
  banco: '001',
  agencia: '1234',
  conta: '5678-9',
  ativo: true,
  empresa_id: 'emp-1',
  colaboradores: { id: 'col-1', nome_completo: 'João Silva' },
};

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/hooks', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/hooks/usePiiMask', () => ({ usePiiMask: () => ({ cpf: (v: string) => v }) }));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));
vi.mock('@/services', () => ({
  colaboradorService: { list: vi.fn(async () => [{ id: 'col-1', nome_completo: 'João Silva' }]) },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      // A 1ª chamada é a listagem; as seguintes são escritas (update).
      const isList = builders.length === 0;
      const q = createQueryBuilder(isList ? { data: [pensao], error: null } : updateResult);
      builders.push({ table, q });
      return q;
    }),
  },
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PensoesPage />
    </QueryClientProvider>
  );
}

describe('PensoesPage — edição', () => {
  beforeEach(() => {
    builders.length = 0;
    updateResult = { data: null, error: null };
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it('abre o formulário preenchido e salva via update escopado por id e empresa', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(screen.getByText('Editar Pensão')).toBeInTheDocument();
    const beneficiario = screen.getByDisplayValue('Maria Souza');
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5678-9')).toBeInTheDocument();

    fireEvent.change(beneficiario, { target: { value: 'Maria S. Lima' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Pensão atualizada'));
    const write = builders[1];
    expect(write.table).toBe('pensoes');
    const calls = write.q.__calls;
    const update = calls.find((c) => c.method === 'update');
    expect(update?.args[0]).toMatchObject({
      colaborador_id: 'col-1',
      beneficiario: 'Maria S. Lima',
      tipo: 'judicial',
      percentual: 30,
      valor_fixo: null,
      conta: '5678-9',
    });
    expect(calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([
      ['id', 'pen-1'],
      ['empresa_id', 'emp-1'],
    ]);
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
  });

  it('mostra erro quando o update falha', async () => {
    updateResult = { data: null, error: { message: 'falha' } };
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });
});
