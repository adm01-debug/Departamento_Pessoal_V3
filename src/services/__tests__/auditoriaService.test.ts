import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditoriaService, notificacaoService } from '../auditoriaService';

const { mockFrom, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, auth: { getUser: mockGetUser } },
}));

// Thenable chain: select → order → optional filters → await
function setupListChain(data: any[], error: any = null) {
  const response = { data, error };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain };
}

// ─── auditoriaService.listar ──────────────────────────────────────────────────

describe('auditoriaService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all audit records without filters', async () => {
    const records = [{ id: 'a1', tabela: 'colaboradores', acao: 'UPDATE' }];
    setupListChain(records);
    const result = await auditoriaService.listar();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await auditoriaService.listar();
    expect(result).toEqual([]);
  });

  it('orders by created_at descending', async () => {
    const { chain } = setupListChain([]);
    await auditoriaService.listar();
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('filters by tabela when provided', async () => {
    const { chain } = setupListChain([]);
    await auditoriaService.listar({ tabela: 'colaboradores' });
    expect(chain.eq).toHaveBeenCalledWith('tabela', 'colaboradores');
  });

  it('filters by acao when provided', async () => {
    const { chain } = setupListChain([]);
    await auditoriaService.listar({ acao: 'DELETE' });
    expect(chain.eq).toHaveBeenCalledWith('acao', 'DELETE');
  });

  it('filters by registro_id when provided', async () => {
    const { chain } = setupListChain([]);
    await auditoriaService.listar({ registro_id: 'reg-1' });
    expect(chain.eq).toHaveBeenCalledWith('registro_id', 'reg-1');
  });

  it('applies gte filter for data_inicio', async () => {
    const { chain } = setupListChain([]);
    await auditoriaService.listar({ data_inicio: '2026-01-01' });
    expect(chain.gte).toHaveBeenCalledWith('created_at', '2026-01-01');
  });

  it('applies lte filter for data_fim', async () => {
    const { chain } = setupListChain([]);
    await auditoriaService.listar({ data_fim: '2026-12-31' });
    expect(chain.lte).toHaveBeenCalledWith('created_at', '2026-12-31');
  });

  it('applies limit when provided', async () => {
    const { chain } = setupListChain([]);
    await auditoriaService.listar({ limite: 10 });
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(auditoriaService.listar()).rejects.toBeDefined();
  });
});

// ─── auditoriaService.logComVersao ────────────────────────────────────────────

describe('auditoriaService.logComVersao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts audit log with user info', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'admin@test.com' } } });
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertFn });

    await auditoriaService.logComVersao({
      tabela: 'colaboradores',
      registro_id: 'c1',
      acao: 'UPDATE',
      dados_anteriores: { nome: 'Old' },
      dados_novos: { nome: 'New' },
    });

    expect(mockFrom).toHaveBeenCalledWith('audit_log');
    const insertArg = insertFn.mock.calls[0][0];
    expect(insertArg.tabela).toBe('colaboradores');
    expect(insertArg.registro_id).toBe('c1');
    expect(insertArg.acao).toBe('UPDATE');
    expect(insertArg.user_id).toBe('u1');
    expect(insertArg.user_email).toBe('admin@test.com');
  });

  it('uses null for dados_novos when not provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'admin@test.com' } } });
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertFn });

    await auditoriaService.logComVersao({
      tabela: 'colaboradores',
      registro_id: 'c1',
      acao: 'DELETE',
      dados_anteriores: { nome: 'Old' },
    });

    const insertArg = insertFn.mock.calls[0][0];
    expect(insertArg.dados_novos).toBeNull();
  });
});

// ─── notificacaoService.listar ────────────────────────────────────────────────

describe('notificacaoService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns notifications without userId filter', async () => {
    const records = [{ id: 'n1', lida: false }];
    setupListChain(records);
    const result = await notificacaoService.listar();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await notificacaoService.listar();
    expect(result).toEqual([]);
  });

  it('filters by user_id when provided', async () => {
    const { chain } = setupListChain([]);
    await notificacaoService.listar('u1');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('limits to 50 records', async () => {
    const { chain } = setupListChain([]);
    await notificacaoService.listar();
    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(notificacaoService.listar()).rejects.toBeDefined();
  });
});

// ─── notificacaoService.marcarComoLida ────────────────────────────────────────

describe('notificacaoService.marcarComoLida', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates lida=true for given id', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ update: updateFn });

    await notificacaoService.marcarComoLida('n1');
    expect(updateFn).toHaveBeenCalledWith({ lida: true });
    expect(eqFn).toHaveBeenCalledWith('id', 'n1');
  });

  it('throws on DB error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ update: updateFn });

    await expect(notificacaoService.marcarComoLida('n1')).rejects.toBeDefined();
  });
});

// ─── notificacaoService.marcarTodasComoLidas ─────────────────────────────────

describe('notificacaoService.marcarTodasComoLidas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates lida=true filtered by user_id and lida=false', async () => {
    const eqFn2 = vi.fn().mockResolvedValue({ error: null });
    const eqFn1 = vi.fn().mockReturnValue({ eq: eqFn2 });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn1 });
    mockFrom.mockReturnValue({ update: updateFn });

    await notificacaoService.marcarTodasComoLidas('u1');
    expect(updateFn).toHaveBeenCalledWith({ lida: true });
    expect(eqFn1).toHaveBeenCalledWith('user_id', 'u1');
    expect(eqFn2).toHaveBeenCalledWith('lida', false);
  });

  it('throws on DB error', async () => {
    const eqFn2 = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    const eqFn1 = vi.fn().mockReturnValue({ eq: eqFn2 });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn1 });
    mockFrom.mockReturnValue({ update: updateFn });

    await expect(notificacaoService.marcarTodasComoLidas('u1')).rejects.toBeDefined();
  });
});
