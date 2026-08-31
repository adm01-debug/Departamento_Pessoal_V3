import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { registrarAcessoPII } from '../piiAccessLogService';

const USER_ID = 'uuuuuuuu-0000-0000-0000-000000000001';

const { mockFrom, mockGetSession } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    from: (...a: unknown[]) => deepChain(mockFrom(...a)),
  },
}));

function mockInsertFn() {
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({ insert });
  return insert;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registrarAcessoPII (E-036 · trilha LGPD art.37)', () => {
  it('insere trilha com user_id da sessão e campos da leitura', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: USER_ID } } },
    });
    const insert = mockInsertFn();

    await registrarAcessoPII('holerites', 'select', {
      empresaId: 'e1',
      registroId: 'r1',
      registroCount: 3,
    });

    expect(mockFrom).toHaveBeenCalledWith('pii_access_logs');
    expect(insert).toHaveBeenCalledWith({
      user_id: USER_ID,
      empresa_id: 'e1',
      tabela: 'holerites',
      acao: 'select',
      registro_id: 'r1',
      registro_count: 3,
    });
  });

  it('sem sessão não insere nada (trilha é de usuário autenticado)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const insert = mockInsertFn();

    await registrarAcessoPII('colaboradores', 'select', { empresaId: 'e1' });

    expect(insert).not.toHaveBeenCalled();
  });

  it('falha de insert/rede NÃO propaga (observabilidade não derruba negócio)', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: USER_ID } } },
    });
    const insert = vi.fn().mockRejectedValue(new Error('network'));
    mockFrom.mockReturnValue({ insert });

    await expect(
      registrarAcessoPII('holerites', 'export', {}),
    ).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalled();
  });
});
