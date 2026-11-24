import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { auditoriaService, notificacaoService } from '../auditoriaService';
import { makeChain } from '@/test/chain';

const EMPRESA_ID = 'test-empresa-id';
const USER_ID = 'test-user-id';

const { mockFrom, mockGetUser, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => deepChain(mockFrom(...a)),
    rpc: (...a: unknown[]) => mockRpc(...a),
    auth: { getUser: mockGetUser },
  },
}));

// Chain canônico (suporta encadeamento arbitrário do PostgREST)
function setupListChain(data: any[], error: any = null) {
  const chain = makeChain({ data, error });
  mockFrom.mockReturnValue(chain);
  return { selectFn: chain.select, chain };
}

// ─── auditoriaService.listar (via RPC listar_auditoria) ──────────────────────

describe('auditoriaService.listar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  it('exige empresa_id (isolamento de tenant)', async () => {
    await expect(auditoriaService.listar('')).rejects.toThrow(/empresa_id/);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('usa a RPC segura em vez de ler a tabela diretamente', async () => {
    await auditoriaService.listar(EMPRESA_ID);
    expect(mockRpc).toHaveBeenCalledWith('listar_auditoria', expect.any(Object));
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('retorna os registros da RPC', async () => {
    const records = [{ id: 'a1', tabela: 'colaboradores', acao: 'UPDATE' }];
    mockRpc.mockResolvedValue({ data: records, error: null });
    await expect(auditoriaService.listar(EMPRESA_ID)).resolves.toEqual(records);
  });

  it('retorna array vazio quando data é null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(auditoriaService.listar(EMPRESA_ID)).resolves.toEqual([]);
  });

  it('propaga o empresa_id e os filtros para a RPC', async () => {
    await auditoriaService.listar(EMPRESA_ID, {
      tabela: 'colaboradores',
      acao: 'DELETE',
      registro_id: 'reg-1',
      data_inicio: '2026-01-01',
      data_fim: '2026-12-31',
      limite: 10,
    });
    expect(mockRpc).toHaveBeenCalledWith('listar_auditoria', {
      p_empresa_id: EMPRESA_ID,
      p_tabela: 'colaboradores',
      p_acao: 'DELETE',
      p_registro_id: 'reg-1',
      p_data_inicio: '2026-01-01',
      p_data_fim: '2026-12-31',
      p_limite: 10,
    });
  });

  it('usa limite padrão de 200 e filtros nulos', async () => {
    await auditoriaService.listar(EMPRESA_ID);
    expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_limite: 200, p_tabela: null, p_acao: null });
  });

  it('lança em erro da RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    await expect(auditoriaService.listar(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── auditoriaService.logComVersao (via RPC registrar_auditoria) ─────────────

describe('auditoriaService.logComVersao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: 'audit-id', error: null });
  });

  it('registra a auditoria pela RPC, sem informar o autor pelo cliente', async () => {
    await auditoriaService.logComVersao({
      tabela: 'colaboradores',
      registro_id: 'c1',
      acao: 'UPDATE',
      dados_anteriores: { nome: 'Old' },
      dados_novos: { nome: 'New' },
      empresa_id: EMPRESA_ID,
    });

    expect(mockFrom).not.toHaveBeenCalled();
    const [fn, args] = mockRpc.mock.calls[0];
    expect(fn).toBe('registrar_auditoria');
    expect(args).toEqual({
      p_tabela: 'colaboradores',
      p_registro_id: 'c1',
      p_acao: 'UPDATE',
      p_dados_anteriores: { nome: 'Old' },
      p_dados_novos: { nome: 'New' },
      p_empresa_id: EMPRESA_ID,
    });
    // A autoria é derivada de auth.uid() no servidor — nunca enviada pelo cliente.
    expect(Object.keys(args)).not.toContain('p_user_id');
  });

  it('usa null para dados_novos quando não informado', async () => {
    await auditoriaService.logComVersao({
      tabela: 'colaboradores',
      registro_id: 'c1',
      acao: 'DELETE',
      dados_anteriores: { nome: 'Old' },
    });
    expect(mockRpc.mock.calls[0][1].p_dados_novos).toBeNull();
    expect(mockRpc.mock.calls[0][1].p_empresa_id).toBeNull();
  });

  it('não quebra a operação de negócio em caso de falha', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
    await expect(
      auditoriaService.logComVersao({
        tabela: 'colaboradores',
        registro_id: 'c1',
        acao: 'UPDATE',
        dados_anteriores: {},
      })
    ).resolves.toBeUndefined();
  });
});


// ─── notificacaoService.listar ────────────────────────────────────────────────

describe('notificacaoService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns notifications without userId filter', async () => {
    const records = [{ id: 'n1', lida: false }];
    setupListChain(records);
    const result = await notificacaoService.listar(USER_ID);
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await notificacaoService.listar(USER_ID);
    expect(result).toEqual([]);
  });

  it('filters by user_id when provided', async () => {
    const { chain } = setupListChain([]);
    await notificacaoService.listar('u1');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('limits to 50 records', async () => {
    const { chain } = setupListChain([]);
    await notificacaoService.listar(USER_ID);
    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(notificacaoService.listar(USER_ID)).rejects.toBeDefined();
  });
});

// ─── notificacaoService.marcarComoLida ────────────────────────────────────────

describe('notificacaoService.marcarComoLida', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates lida=true for given id', async () => {
    const chain = makeChain({ error: null });
    const updateFn = chain.update; const eqFn = chain.eq;
    mockFrom.mockReturnValue(chain);

    await notificacaoService.marcarComoLida(USER_ID, 'n1');
    expect(updateFn).toHaveBeenCalledWith({ lida: true });
    expect(eqFn).toHaveBeenCalledWith('id', 'n1');
  });

  it('throws on DB error', async () => {
    const chain = makeChain({ error: { message: 'fail' } });
    mockFrom.mockReturnValue(chain);

    await expect(notificacaoService.marcarComoLida(USER_ID, 'n1')).rejects.toBeDefined();
  });
});

// ─── notificacaoService.marcarTodasComoLidas ─────────────────────────────────

describe('notificacaoService.marcarTodasComoLidas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates lida=true filtered by user_id and lida=false', async () => {
    const chain = makeChain({ error: null });
    const updateFn = chain.update; const eqFn1 = chain.eq; const eqFn2 = chain.eq;
    mockFrom.mockReturnValue(chain);

    await notificacaoService.marcarTodasComoLidas('u1');
    expect(updateFn).toHaveBeenCalledWith({ lida: true });
    expect(eqFn1).toHaveBeenCalledWith('user_id', 'u1');
    expect(eqFn2).toHaveBeenCalledWith('lida', false);
  });

  it('throws on DB error', async () => {
    const chain = makeChain({ error: { message: 'fail' } });
    mockFrom.mockReturnValue(chain);

    await expect(notificacaoService.marcarTodasComoLidas('u1')).rejects.toBeDefined();
  });
});
