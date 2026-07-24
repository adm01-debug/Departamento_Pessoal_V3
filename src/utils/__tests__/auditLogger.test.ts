import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditLogger } from '../auditLogger';

const { mockGetUser, mockInsert } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue({ insert: mockInsert }),
  },
}));

describe('auditLogger.log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@test.com' } } });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('calls auth.getUser to resolve user identity', async () => {
    await auditLogger.log({
      tabela: 'colaboradores',
      registro_id: 'colab-1',
      acao: 'INSERT',
    });
    expect(mockGetUser).toHaveBeenCalled();
  });

  it('inserts into audit_log with correct tabela, registro_id, and acao', async () => {
    await auditLogger.log({
      tabela: 'colaboradores',
      registro_id: 'colab-1',
      acao: 'UPDATE',
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tabela: 'colaboradores',
        registro_id: 'colab-1',
        acao: 'UPDATE',
      })
    );
  });

  it('uses authenticated user id and email when not explicitly provided', async () => {
    await auditLogger.log({
      tabela: 'folha',
      registro_id: 'folha-1',
      acao: 'EXECUTE_CALC',
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        user_email: 'test@test.com',
      })
    );
  });

  it('uses explicitly provided user_id and user_email over authenticated user', async () => {
    await auditLogger.log({
      tabela: 'folha',
      registro_id: 'folha-1',
      acao: 'DELETE',
      user_id: 'override-user',
      user_email: 'override@email.com',
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'override-user',
        user_email: 'override@email.com',
      })
    );
  });

  it('includes dados_anteriores and dados_novos when provided', async () => {
    const antes = { nome: 'Old Name' };
    const depois = { nome: 'New Name' };
    await auditLogger.log({
      tabela: 'colaboradores',
      registro_id: 'c1',
      acao: 'UPDATE',
      dados_anteriores: antes,
      dados_novos: depois,
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ dados_anteriores: antes, dados_novos: depois })
    );
  });

  it('sets dados_anteriores=null when not provided', async () => {
    await auditLogger.log({
      tabela: 'colaboradores',
      registro_id: 'c1',
      acao: 'INSERT',
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ dados_anteriores: null })
    );
  });

  it('does NOT throw when insert returns error (swallows errors)', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } });
    await expect(
      auditLogger.log({ tabela: 'x', registro_id: 'y', acao: 'INSERT' })
    ).resolves.not.toThrow();
  });

  it('does NOT throw when auth.getUser throws (swallows exceptions)', async () => {
    mockGetUser.mockRejectedValue(new Error('Auth failure'));
    await expect(
      auditLogger.log({ tabela: 'x', registro_id: 'y', acao: 'DELETE' })
    ).resolves.not.toThrow();
  });
});
