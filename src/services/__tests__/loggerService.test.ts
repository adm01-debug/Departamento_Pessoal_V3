import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loggerService } from '../loggerService';

const mockRpcResult = { catch: vi.fn() };
const mockRpc = vi.fn((_fn: string, _args?: unknown) => mockRpcResult);
const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
const mockFrom = vi.fn((_table: string) => ({ insert: mockInsert }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
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

  it('should enrich context with url and user_agent', async () => {
    await loggerService.error('Enriched error', { customKey: 'value' });

    const callArg = mockRpc.mock.calls[0][1] as { p_contexto: Record<string, unknown> };
    expect(callArg.p_contexto).toMatchObject({
      customKey: 'value',
      url: expect.any(String),
      user_agent: expect.any(String),
    });
  });
});
