import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: mockRpc },
}));

import { PolicyAuditPanel } from '../PolicyAuditPanel';

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PolicyAuditPanel />
    </QueryClientProvider>
  );
}

describe('PolicyAuditPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa a RPC de auditoria de políticas', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    renderPanel();
    await screen.findByText(/Nenhuma política sem escopo de empresa detectada/i);
    expect(mockRpc).toHaveBeenCalledWith('sec_audit_policies');
  });

  it('lista as políticas sem escopo de empresa quando houver regressão', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          tabela: 'cnab_itens',
          policy_name: 'itens_publicos',
          cmd: 'SELECT',
          motivo: 'subconsulta sem correlacao com auth.uid()',
        },
      ],
      error: null,
    });
    renderPanel();
    expect(await screen.findByText('cnab_itens')).toBeInTheDocument();
    expect(screen.getByText('itens_publicos')).toBeInTheDocument();
    // Não pode exibir a mensagem de "tudo certo" havendo achados.
    expect(
      screen.queryByText(/Nenhuma política sem escopo de empresa detectada/i)
    ).not.toBeInTheDocument();
  });

  it('não finge segurança quando o usuário não tem permissão de auditoria', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    renderPanel();
    expect(
      await screen.findByText(/disponível apenas para administradores/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Nenhuma política sem escopo de empresa detectada/i)
    ).not.toBeInTheDocument();
  });
});
