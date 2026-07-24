import { describe, it, expect, vi, beforeEach } from 'vitest';
import { criarNotificacao, notificarResultadoSync, notificarAjustePonto, notificacoesService } from '../notificacoesService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
}));

function setupInsertChain(error: any = null) {
  const insertFn = vi.fn().mockResolvedValue({ error });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn };
}

function setupColaboradorChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  return { selectFn, eqFn, maybeSingle };
}

// ─── criarNotificacao ─────────────────────────────────────────────────────────

describe('criarNotificacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } } });
  });

  it('calls supabase.auth.getUser to get current user', async () => {
    setupInsertChain();
    await criarNotificacao({ titulo: 'T', mensagem: 'M', tipo: 'info' });
    expect(mockGetUser).toHaveBeenCalled();
  });

  it('inserts notification with provided fields', async () => {
    const { insertFn } = setupInsertChain();
    await criarNotificacao({ titulo: 'Aviso', mensagem: 'Detalhe', tipo: 'alerta' });
    const payload = (insertFn as any).mock.calls[0][0];
    expect(payload.titulo).toBe('Aviso');
    expect(payload.mensagem).toBe('Detalhe');
    expect(payload.tipo).toBe('alerta');
    expect(payload.lida).toBe(false);
  });

  it('uses current user id when payload.user_id is not provided', async () => {
    const { insertFn } = setupInsertChain();
    await criarNotificacao({ titulo: 'T', mensagem: 'M', tipo: 'sucesso' });
    const payload = (insertFn as any).mock.calls[0][0];
    expect(payload.user_id).toBe('auth-user-1');
  });

  it('uses payload.user_id when explicitly provided', async () => {
    const { insertFn } = setupInsertChain();
    await criarNotificacao({ titulo: 'T', mensagem: 'M', tipo: 'info', user_id: 'target-user' });
    const payload = (insertFn as any).mock.calls[0][0];
    expect(payload.user_id).toBe('target-user');
  });

  it('includes empresa_id and entidade fields when provided', async () => {
    const { insertFn } = setupInsertChain();
    await criarNotificacao({
      titulo: 'T', mensagem: 'M', tipo: 'info',
      empresa_id: 'emp-1',
      entidade_id: 'ent-1',
      entidade_tipo: 'colaborador',
    });
    const payload = (insertFn as any).mock.calls[0][0];
    expect(payload.empresa_id).toBe('emp-1');
    expect(payload.entidade_id).toBe('ent-1');
    expect(payload.entidade_tipo).toBe('colaborador');
  });

  it('throws on DB error', async () => {
    setupInsertChain({ message: 'fail' });
    await expect(
      criarNotificacao({ titulo: 'T', mensagem: 'M', tipo: 'erro' })
    ).rejects.toBeDefined();
  });
});

// ─── notificarResultadoSync ───────────────────────────────────────────────────

describe('notificarResultadoSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  });

  it('creates success notification when sucesso=true', async () => {
    const { insertFn } = setupInsertChain();
    await notificarResultadoSync(true, 10, []);
    const payload = (insertFn as any).mock.calls[0][0];
    expect(payload.tipo).toBe('sucesso');
    expect(payload.titulo).toContain('concluída');
    expect(payload.mensagem).toContain('10');
  });

  it('creates error notification when sucesso=false', async () => {
    const { insertFn } = setupInsertChain();
    await notificarResultadoSync(false, 0, ['Erro A', 'Erro B']);
    const payload = (insertFn as any).mock.calls[0][0];
    expect(payload.tipo).toBe('erro');
    expect(payload.titulo).toContain('Erro');
    expect(payload.mensagem).toContain('Erro A');
  });

  it('throws when DB insert fails', async () => {
    setupInsertChain({ message: 'fail' });
    await expect(notificarResultadoSync(true, 5, [])).rejects.toBeDefined();
  });
});

// ─── notificarAjustePonto ─────────────────────────────────────────────────────

describe('notificarAjustePonto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  });

  it('creates aprovado notification when status=aprovado', async () => {
    const colab = { id: 'c1', empresa_id: 'emp-1', email: 'a@b.com' };
    const { selectFn, eqFn, maybeSingle } = setupColaboradorChain(colab);
    mockFrom
      .mockReturnValueOnce({ select: selectFn })  // colaboradores query
      .mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ error: null }) }); // insert

    await notificarAjustePonto('c1', 'aprovado');
    expect(eqFn).toHaveBeenCalledWith('id', 'c1');
  });

  it('creates recusado notification with motivo when status=recusado', async () => {
    const colab = { id: 'c1', empresa_id: 'emp-1', email: 'a@b.com' };
    const { selectFn } = setupColaboradorChain(colab);
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom
      .mockReturnValueOnce({ select: selectFn })
      .mockReturnValueOnce({ insert: insertFn });

    await notificarAjustePonto('c1', 'recusado', 'Horário inválido');
    const insertPayload = (insertFn as any).mock.calls[0][0];
    expect(insertPayload.tipo).toBe('erro');
    expect(insertPayload.mensagem).toContain('Horário inválido');
  });

  it('does not throw when colaborador is not found (returns undefined)', async () => {
    const { selectFn } = setupColaboradorChain(null);
    mockFrom.mockReturnValueOnce({ select: selectFn });

    await expect(notificarAjustePonto('c-unknown', 'aprovado')).resolves.toBeUndefined();
  });

  it('returns undefined silently when colaborador DB query returns an error (null data)', async () => {
    // The implementation only checks `if (colab)` (data), not the error field
    const { selectFn } = setupColaboradorChain(null, { message: 'db fail' });
    mockFrom.mockReturnValueOnce({ select: selectFn });

    await expect(notificarAjustePonto('c1', 'aprovado')).resolves.toBeUndefined();
  });
});

// ─── notificacoesService export ───────────────────────────────────────────────

describe('notificacoesService', () => {
  it('exposes criarNotificacao', () => {
    expect(notificacoesService.criarNotificacao).toBe(criarNotificacao);
  });

  it('exposes notificarResultadoSync', () => {
    expect(notificacoesService.notificarResultadoSync).toBe(notificarResultadoSync);
  });

  it('exposes notificarAjustePonto', () => {
    expect(notificacoesService.notificarAjustePonto).toBe(notificarAjustePonto);
  });
});
