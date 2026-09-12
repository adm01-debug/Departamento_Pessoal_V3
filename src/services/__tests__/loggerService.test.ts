import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loggerService } from '../loggerService';

const mockRpcResult = { catch: vi.fn() };
const mockRpc = vi.fn((_fn: string, _args?: unknown) => mockRpcResult);
const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
const mockFrom = vi.fn((_table: string) => ({ insert: mockInsert }));
const mockGetSession = vi.fn<() => Promise<{ data: { session: { access_token: string } | null } }>>(() =>
  Promise.resolve({ data: { session: { access_token: 'test-token' } } })
);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } } })),
    },
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, args: unknown) => mockRpc(fn, args),
  },
}));

describe('loggerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpcResult.catch.mockReturnValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should buffer info logs and not call supabase rpc immediately', async () => {
    await loggerService.info('Test log 1');
    await loggerService.info('Test log 2');

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should flush error logs immediately via rpc', async () => {
    await loggerService.error('Test error');

    expect(mockRpc).toHaveBeenCalledWith(
      'log_frontend_error',
      expect.objectContaining({ p_nivel: 'error', p_mensagem: 'Test error' })
    );
    expect(mockFrom).not.toHaveBeenCalledWith('logs_sistema');
  });

  it('should flush warn logs immediately via rpc for security audit', async () => {
    await loggerService.warn('Account locked warning');

    expect(mockRpc).toHaveBeenCalledWith(
      'log_frontend_error',
      expect.objectContaining({ p_nivel: 'warn', p_mensagem: 'Account locked warning' })
    );
  });

  it('should flush fatal logs immediately via rpc', async () => {
    await loggerService.fatal('Critical failure');

    expect(mockRpc).toHaveBeenCalledWith(
      'log_frontend_error',
      expect.objectContaining({ p_nivel: 'fatal', p_mensagem: 'Critical failure' })
    );
  });

  it('should flush info logs after 50 entries without hitting rpc', async () => {
    for (let i = 0; i < 50; i++) {
      await loggerService.info(`Log ${i}`);
    }

    // Info logs should not be persisted remotely even at buffer capacity
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should not call logs_sistema table directly', async () => {
    await loggerService.error('Should use rpc not direct insert');
    expect(mockFrom).not.toHaveBeenCalledWith('logs_sistema');
  });

  it('redacts PII, tokens and URL query strings before invoking the audit RPC', async () => {
    await loggerService.error('Login for pessoa@example.com with token=top-secret', {
      customKey: 'value',
      email: 'pessoa@example.com',
      password: 'senha-real',
      cpf: '123.456.789-09',
      userId: 'user-123',
      callback_url: 'https://app.example.com/reset?token=top-secret#recovery',
      nested: { access_token: 'eyJhbGciOiJIUzI1NiJ9.payload.signature' },
    });

    const callArg = mockRpc.mock.calls[0][1] as { p_mensagem: string; p_contexto: Record<string, unknown> };
    expect(callArg.p_contexto).toMatchObject({
      customKey: 'value',
      email: '[REDACTED]',
      password: '[REDACTED]',
      cpf: '[REDACTED]',
      userId: '[REDACTED]',
      callback_url: 'https://app.example.com/reset',
      nested: { access_token: '[REDACTED]' },
    });
    expect(callArg.p_contexto.url).toBe(`${window.location.origin}${window.location.pathname}`);
    expect(callArg.p_contexto).not.toHaveProperty('user_agent');
    expect(JSON.stringify(callArg)).not.toContain('pessoa@example.com');
    expect(JSON.stringify(callArg)).not.toContain('top-secret');
    expect(callArg.p_mensagem).toBe('Login for [REDACTED] with token=[REDACTED]');
  });

  it('handles circular context without losing the redaction boundary', async () => {
    const circular: Record<string, unknown> = { email: 'pessoa@example.com' };
    circular.self = circular;

    await expect(loggerService.error('Circular context', circular)).resolves.toBeUndefined();

    const callArg = mockRpc.mock.calls[0][1] as { p_contexto: Record<string, unknown> };
    expect(callArg.p_contexto).toMatchObject({ email: '[REDACTED]', self: '[CIRCULAR]' });
  });

  it('keeps pre-auth logs local instead of calling a protected RPC', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    await loggerService.warn('Pre-auth login failure');

    expect(mockRpc).not.toHaveBeenCalled();
  });
});
