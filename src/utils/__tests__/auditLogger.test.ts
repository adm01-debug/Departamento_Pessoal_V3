import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditLogger } from '../auditLogger';

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

describe('auditLogger.log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: 'audit-id', error: null });
  });

  it('uses the server-authoritative RPC and never writes an audit table directly', async () => {
    await auditLogger.log({
      tabela: 'colaboradores',
      registro_id: 'colab-1',
      acao: 'INSERT',
      empresa_id: 'empresa-1',
    });
    expect(mockRpc).toHaveBeenCalledWith('registrar_auditoria', expect.any(Object));
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('passes entity, record, action and tenant without client-controlled authorship', async () => {
    await auditLogger.log({
      tabela: 'colaboradores',
      registro_id: 'colab-1',
      acao: 'UPDATE',
      empresa_id: 'empresa-1',
    });
    const args = mockRpc.mock.calls[0][1];
    expect(args).toMatchObject({
      p_tabela: 'colaboradores',
      p_registro_id: 'colab-1',
      p_acao: 'UPDATE',
      p_empresa_id: 'empresa-1',
    });
    expect(Object.keys(args)).not.toContain('p_user_id');
    expect(Object.keys(args)).not.toContain('p_user_email');
  });

  it('infers empresa_id from the new snapshot', async () => {
    await auditLogger.log({
      tabela: 'folha',
      registro_id: 'folha-1',
      acao: 'EXECUTE_CALC',
      dados_novos: { empresa_id: 'empresa-from-row', total: 10 },
    });
    expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_empresa_id: 'empresa-from-row' });
  });

  it('includes dados_anteriores and dados_novos inside payload when provided', async () => {
    const antes = { nome: 'Old Name' };
    const depois = { nome: 'New Name' };
    await auditLogger.log({
      tabela: 'colaboradores',
      registro_id: 'c1',
      acao: 'UPDATE',
      dados_anteriores: antes,
      dados_novos: depois,
    });
    expect(mockRpc.mock.calls[0][1]).toMatchObject({
      p_dados_anteriores: antes,
      p_dados_novos: depois,
    });
  });

  it('masks PII before sending snapshots to the RPC', async () => {
    await auditLogger.log({
      tabela: 'colaboradores',
      registro_id: 'c1',
      acao: 'INSERT',
      empresa_id: 'empresa-1',
      dados_novos: { cpf: '123.456.789-00', nome: 'Pessoa' },
    });
    expect(mockRpc.mock.calls[0][1]).toMatchObject({
      p_dados_anteriores: null,
      p_dados_novos: { cpf: '***.***.***-**', nome: 'Pessoa' },
    });
  });

  it('does NOT throw when the audit RPC returns error (swallows errors)', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'DB error' } });
    await expect(auditLogger.log({ tabela: 'x', registro_id: 'y', acao: 'INSERT' })).resolves.not.toThrow();
  });

  it('does NOT throw when the audit RPC throws (swallows exceptions)', async () => {
    mockRpc.mockRejectedValue(new Error('Auth failure'));
    await expect(auditLogger.log({ tabela: 'x', registro_id: 'y', acao: 'DELETE' })).resolves.not.toThrow();
  });
});
