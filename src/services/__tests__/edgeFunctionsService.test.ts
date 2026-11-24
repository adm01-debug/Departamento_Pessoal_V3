import { describe, it, expect, vi, beforeEach } from 'vitest';
import { edgeFunctionsService } from '../edgeFunctionsService';

const { mockInvoke, mockBitrixExecute, mockResendExecute, mockGenericExecute } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockBitrixExecute: vi.fn(),
  mockResendExecute: vi.fn(),
  mockGenericExecute: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mockInvoke } },
}));

vi.mock('@/lib/circuitBreaker', () => ({
  bitrixBreaker: { execute: mockBitrixExecute },
  resendBreaker: { execute: mockResendExecute },
  genericBreaker: { execute: mockGenericExecute },
}));

// ─── dispararAlertasDP ────────────────────────────────────────────────────────

describe('edgeFunctionsService.dispararAlertasDP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenericExecute.mockImplementation((fn: any) => fn());
  });

  it('calls invoke with "alertas-dp" and trigger body', async () => {
    mockInvoke.mockResolvedValue({ data: { sent: 3 }, error: null });
    const result = await edgeFunctionsService.dispararAlertasDP();
    expect(mockInvoke).toHaveBeenCalledWith('alertas-dp', { body: { trigger: 'manual' } });
    expect(result).toEqual({ sent: 3 });
  });

  it('uses genericBreaker', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null });
    await edgeFunctionsService.dispararAlertasDP();
    expect(mockGenericExecute).toHaveBeenCalled();
    expect(mockResendExecute).not.toHaveBeenCalled();
    expect(mockBitrixExecute).not.toHaveBeenCalled();
  });
});

// ─── enviarRelatorioEmail ─────────────────────────────────────────────────────

describe('edgeFunctionsService.enviarRelatorioEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResendExecute.mockImplementation((fn: any) => fn());
  });

  it('calls invoke with "enviar-relatorio" and uses resendBreaker', async () => {
    mockInvoke.mockResolvedValue({ data: { messageId: 'msg-1' }, error: null });
    const params = {
      tipo: 'folha',
      destinatarios: ['rh@empresa.com'],
      empresaId: 'emp-1',
      competencia: '2026-07',
    };
    const result = await edgeFunctionsService.enviarRelatorioEmail(params);
    expect(mockInvoke).toHaveBeenCalledWith('enviar-relatorio', { body: params });
    expect(mockResendExecute).toHaveBeenCalled();
    expect(mockGenericExecute).not.toHaveBeenCalled();
    expect(result).toEqual({ messageId: 'msg-1' });
  });
});

// ─── sincronizarBitrix ────────────────────────────────────────────────────────

describe('edgeFunctionsService.sincronizarBitrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBitrixExecute.mockImplementation((fn: any) => fn());
  });

  it('calls invoke with "sincronizar-bitrix" and uses bitrixBreaker', async () => {
    mockInvoke.mockResolvedValue({ data: { synced: 10 }, error: null });
    const result = await edgeFunctionsService.sincronizarBitrix({ action: 'sync_all' });
    expect(mockInvoke).toHaveBeenCalledWith('sincronizar-bitrix', { body: { action: 'sync_all' } });
    expect(mockBitrixExecute).toHaveBeenCalled();
    expect(mockGenericExecute).not.toHaveBeenCalled();
    expect(result).toEqual({ synced: 10 });
  });
});

// ─── healthcheck ──────────────────────────────────────────────────────────────

describe('edgeFunctionsService.healthcheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenericExecute.mockImplementation((fn: any) => fn());
  });

  it('calls invoke with "healthcheck" and empty body', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'ok' }, error: null });
    const result = await edgeFunctionsService.healthcheck();
    expect(mockInvoke).toHaveBeenCalledWith('healthcheck', { body: {} });
    expect(result).toEqual({ status: 'ok' });
  });
});

// ─── calcularFolha ────────────────────────────────────────────────────────────

describe('edgeFunctionsService.calcularFolha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenericExecute.mockImplementation((fn: any) => fn());
  });

  it('calls invoke with idempotency_key when provided', async () => {
    mockInvoke.mockResolvedValue({ data: { total: 50000 }, error: null });
    await edgeFunctionsService.calcularFolha({
      empresaId: 'emp-1',
      competencia: '2026-07',
      idempotencyKey: 'idem-key-abc',
    });
    expect(mockInvoke).toHaveBeenCalledWith('calcular-folha', {
      body: {
        empresa_id: 'emp-1',
        competencia: '2026-07',
        idempotency_key: 'idem-key-abc',
      },
    });
  });

  it('omits idempotency_key when not provided', async () => {
    mockInvoke.mockResolvedValue({ data: { total: 50000 }, error: null });
    await edgeFunctionsService.calcularFolha({
      empresaId: 'emp-1',
      competencia: '2026-07',
    });
    const invokeBody = (mockInvoke as ReturnType<typeof vi.fn>).mock.calls[0][1].body;
    expect(invokeBody).not.toHaveProperty('idempotency_key');
    expect(invokeBody).toEqual({ empresa_id: 'emp-1', competencia: '2026-07' });
  });
});

// ─── error handling ───────────────────────────────────────────────────────────

describe('edgeFunctionsService error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenericExecute.mockImplementation((fn: any) => fn());
  });

  it('throws wrapped Error when invoke returns a supabase error object', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Function not found' } });
    await expect(edgeFunctionsService.healthcheck()).rejects.toThrow('Function not found');
  });

  it('throws wrapped Error when invoke rejects with an exception', async () => {
    mockInvoke.mockRejectedValue(new Error('Network timeout'));
    await expect(edgeFunctionsService.healthcheck()).rejects.toThrow('Network timeout');
  });

  it('throws wrapped Error with fallback message when invoke error has no message', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: {} });
    await expect(edgeFunctionsService.healthcheck()).rejects.toThrow(/healthcheck/);
  });

  it('throws when breaker itself throws (circuit open)', async () => {
    mockGenericExecute.mockRejectedValue(new Error('Circuit Breaker is OPEN. Integration temporarily unavailable.'));
    await expect(edgeFunctionsService.healthcheck()).rejects.toThrow('Circuit Breaker is OPEN');
  });
});
