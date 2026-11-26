/**
 * Testes do painel de saúde de backup (P3-060).
 *
 * Cobre:
 *  1. Renderização das execuções retornadas por public.backup_logs.
 *  2. Teto de linhas (BACKUP_RUNS_LIMIT) e ordenação decrescente por started_at.
 *  3. Estado vazio quando não há execução registrada.
 *  4. Alerta de backup atrasado usando a RPC alert_stale_backup.
 *  5. Falha de leitura exibida como mensagem, sem quebrar a página.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BackupHealthSection, BACKUP_RUNS_LIMIT } from '@/components/admin/BackupHealthSection';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

const from = supabase.from as unknown as ReturnType<typeof vi.fn>;
const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

function renderWithClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BackupHealthSection />
    </QueryClientProvider>
  );
}

const runRow = (overrides: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  status: 'success',
  started_at: new Date(Date.now() - 3_600_000).toISOString(),
  finished_at: new Date().toISOString(),
  duration_ms: 1500,
  records_count: 120,
  tables_count: 13,
  error_message: null,
  ...overrides,
});

function mockRuns(rows: unknown[] | null, error: { message: string } | null = null) {
  const limit = vi.fn().mockResolvedValue({ data: rows, error });
  const order = vi.fn(() => ({ limit }));
  const select = vi.fn(() => ({ order }));
  from.mockReturnValue({ select });
  return { select, order, limit };
}

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: [], error: null });
});

describe('BackupHealthSection', () => {
  it('lista as execuções com status, volume e duração', async () => {
    mockRuns([
      runRow({ records_count: 120, tables_count: 13, duration_ms: 1500 }),
      runRow({
        status: 'error',
        records_count: 7,
        tables_count: 2,
        error_message: 'Falha de integridade no backup',
        duration_ms: null,
      }),
    ]);
    renderWithClient();

    expect(await screen.findByText('sucesso')).toBeInTheDocument();
    expect(screen.getByText('erro')).toBeInTheDocument();
    expect(screen.getByText(/120 registros/)).toBeInTheDocument();
    expect(screen.getByText(/1\.5s/)).toBeInTheDocument();
    expect(screen.getByText('Falha de integridade no backup')).toBeInTheDocument();
  });

  it('respeita o teto de execuções e ordena da mais recente para a mais antiga', async () => {
    const mocks = mockRuns([runRow()]);
    renderWithClient();

    await waitFor(() => expect(mocks.limit).toHaveBeenCalledWith(BACKUP_RUNS_LIMIT));
    expect(from).toHaveBeenCalledWith('backup_logs');
    expect(mocks.order).toHaveBeenCalledWith('started_at', { ascending: false });
  });

  it('mostra estado vazio quando não há execução registrada', async () => {
    mockRuns([]);
    renderWithClient();

    expect(await screen.findByText('Nenhuma execução de backup registrada ainda.')).toBeInTheDocument();
  });

  it('alerta quando alguma empresa está sem backup há mais de 24h', async () => {
    mockRuns([runRow()]);
    rpc.mockResolvedValue({
      data: [
        {
          empresa_id: null,
          empresa_nome: null,
          last_backup_at: new Date(Date.now() - 90_000_000).toISOString(),
          hours_since: 25,
          records_backup: 10,
          tables_backup: 2,
        },
      ],
      error: null,
    });
    renderWithClient();

    expect(await screen.findByText('Backup atrasado (mais de 24h)')).toBeInTheDocument();
    expect(screen.getByText(/Sem empresa vinculada — último backup há 25h/)).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith('alert_stale_backup');
  });

  it('exibe falha de leitura sem quebrar o painel', async () => {
    mockRuns(null, { message: 'permission denied' });
    renderWithClient();

    expect(await screen.findByText('Não foi possível carregar o log de backups.')).toBeInTheDocument();
  });
});
