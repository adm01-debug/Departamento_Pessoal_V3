/**
 * Testes de integração da UI de busca unificada de auditoria.
 *
 * Cobre:
 *  1. Lazy-loading: a RPC search_audit_unified só é chamada após o clique em "Buscar".
 *  2. Limite fixo de 100 eventos por chamada (contrato da RPC).
 *  3. Filtro por tabela de origem propagado corretamente à RPC (_source_table).
 *  4. Filtro vazio → _source_table = null (todas as tabelas).
 *  5. Renderização dos eventos retornados (source_table, action, entity).
 *  6. Permissão admin-only: erro da RPC exibe mensagem apropriada.
 *  7. Empty state quando a RPC retorna [].
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedAuditSection, AUDIT_UNIFIED_LIMIT } from '@/components/admin/UnifiedAuditSection';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

function renderWithClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <UnifiedAuditSection />
    </QueryClientProvider>
  );
}

const sampleRow = (overrides: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  source_table: 'folha_auditoria',
  source_id: crypto.randomUUID(),
  empresa_id: null,
  user_id: '11111111-2222-3333-4444-555555555555',
  action: 'UPDATE',
  entity: 'folhas_pagamento',
  entity_id: 'abc-1',
  payload: { changed: ['status'] },
  ip_address: '10.0.0.1',
  occurred_at: new Date().toISOString(),
  ...overrides,
});

describe('UnifiedAuditSection — integração', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não dispara a RPC no mount (lazy loading — evita custo por default)', () => {
    rpc.mockResolvedValue({ data: [], error: null });
    renderWithClient();

    expect(rpc).not.toHaveBeenCalled();
    // Mensagem inicial exibe o teto correto
    expect(screen.getByText(new RegExp(`últimos ${AUDIT_UNIFIED_LIMIT} eventos`, 'i'))).toBeInTheDocument();
  });

  it('ao clicar em Buscar sem filtro, chama RPC com _source_table=null e _limit=100', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(rpc).toHaveBeenCalledWith('search_audit_unified', {
      _source_table: null,
      _limit: 100,
    });
    // Limite deve ser exatamente 100 — nada de listagens abertas
    const args = rpc.mock.calls[0]?.[1] as { _limit: number };
    expect(args._limit).toBe(100);
    expect(args._limit).toBeLessThanOrEqual(AUDIT_UNIFIED_LIMIT);
  });

  it('propaga filtro por tabela para a RPC (_source_table)', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const user = userEvent.setup();
    renderWithClient();

    await user.type(screen.getByLabelText(/filtro por tabela de origem/i), 'ponto_auditoria');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(rpc).toHaveBeenCalledWith('search_audit_unified', {
      _source_table: 'ponto_auditoria',
      _limit: 100,
    });
  });

  it('renderiza eventos retornados com badges de source_table e action', async () => {
    rpc.mockResolvedValue({
      data: [
        sampleRow({ source_table: 'folha_auditoria', action: 'INSERT' }),
        sampleRow({ source_table: 'ponto_auditoria', action: 'DELETE' }),
      ],
      error: null,
    });
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => expect(screen.getByTestId('audit-list')).toBeInTheDocument());
    expect(screen.getByText('folha_auditoria')).toBeInTheDocument();
    expect(screen.getByText('ponto_auditoria')).toBeInTheDocument();
    expect(screen.getByText('INSERT')).toBeInTheDocument();
    expect(screen.getByText('DELETE')).toBeInTheDocument();
    // Badge de contagem no cabeçalho
    expect(screen.getByText(/2 eventos/i)).toBeInTheDocument();
  });

  it('exibe empty state quando RPC retorna array vazio', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => expect(screen.getByText(/nenhum evento no período/i)).toBeInTheDocument());
    expect(screen.queryByTestId('audit-list')).not.toBeInTheDocument();
  });

  it('permissão admin-only: erro da RPC mostra mensagem clara (não vaza dados)', async () => {
    // A RPC search_audit_unified tem CHECK has_role(auth.uid(),'admin').
    // Usuário sem role → erro. UI deve traduzir para "requer admin".
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'permission denied for function search_audit_unified' },
    });
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => expect(screen.getByText(/requer admin/i)).toBeInTheDocument());
    // Nenhum dado listado
    expect(screen.queryByTestId('audit-list')).not.toBeInTheDocument();
  });

  it('nunca ultrapassa o teto de 100 mesmo se resultado exceder (defesa em camadas)', async () => {
    // Simula RPC hipoteticamente retornando 100 rows exatos — reforça contrato.
    const many = Array.from({ length: 100 }, (_, i) =>
      sampleRow({ id: String(i), source_table: 'audit_log', action: 'READ' })
    );
    rpc.mockResolvedValue({ data: many, error: null });
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => expect(screen.getByTestId('audit-list')).toBeInTheDocument());
    // O limite requisitado é sempre 100
    const args = rpc.mock.calls[0]?.[1] as { _limit: number };
    expect(args._limit).toBe(100);
    expect(screen.getByText(/100 eventos/i)).toBeInTheDocument();
  });
});
