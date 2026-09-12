import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auditLogger } from '../auditLogger';

// Mocking the Supabase client
const { mockRpc, mockFrom } = vi.hoisted(() => ({ mockRpc: vi.fn(), mockFrom: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

describe('Audit Log & RLS Integration Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: 'audit-id', error: null });
  });

  it('should include tenant isolation fields when logging', async () => {
    await auditLogger.log({
      tabela: 'desligamentos',
      registro_id: 'des-456',
      acao: 'INSERT',
      dados_novos: { status: 'pendente', empresa_id: 'empresa-123' },
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'registrar_auditoria',
      expect.objectContaining({
        p_tabela: 'desligamentos',
        p_registro_id: 'des-456',
        p_acao: 'INSERT',
        p_empresa_id: 'empresa-123',
      })
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('delegates authentication and authorship enforcement to the server RPC', async () => {
    await auditLogger.log({
      tabela: 'desligamentos',
      registro_id: 'des-456',
      acao: 'UPDATE',
    });

    expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_empresa_id: null });
    expect(mockRpc.mock.calls[0][1]).not.toHaveProperty('p_user_id');
  });
});
