import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registrarAcessoPII } from '../piiAccessLogService';

const USER_ID = 'uuuuuuuu-0000-0000-0000-000000000001';

const { mockRpc, mockGetSession } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock('@/integrations/supabase/client.base', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    rpc: mockRpc,
  },
}));

function mockRpcSuccess() {
  mockRpc.mockResolvedValue({ data: 'log-id', error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registrarAcessoPII (E-036 · trilha LGPD art.37)', () => {
  it('chama RPC sem permitir que o cliente forneça user_id', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: USER_ID } } },
    });
    mockRpcSuccess();

    await registrarAcessoPII('holerites', 'select', {
      empresaId: 'e1',
      registroId: 'r1',
      registroCount: 3,
    });

    expect(mockRpc).toHaveBeenCalledWith('record_pii_access', {
      p_empresa_id: 'e1',
      p_tabela: 'holerites',
      p_acao: 'select',
      p_registro_id: 'r1',
      p_registro_count: 3,
    });
    expect(mockRpc.mock.calls[0]?.[1]).not.toHaveProperty('user_id');
  });

  it('sem sessão não insere nada (trilha é de usuário autenticado)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockRpcSuccess();

    await registrarAcessoPII('colaboradores', 'select', { empresaId: 'e1' });

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('falha de insert/rede NÃO propaga (observabilidade não derruba negócio)', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: USER_ID } } },
    });
    mockRpc.mockRejectedValue(new Error('network'));

    await expect(registrarAcessoPII('holerites', 'export', { empresaId: 'e1' })).resolves.toBeUndefined();
    expect(mockRpc).toHaveBeenCalled();
  });
});
