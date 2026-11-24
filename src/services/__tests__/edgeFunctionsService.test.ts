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

// ─── gerarGuias ───────────────────────────────────────────────────────────────

describe('edgeFunctionsService.gerarGuias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenericExecute.mockImplementation((fn: (v?: unknown) => unknown) => fn());
  });

  it('envia o contrato da edge: empresa_id + tipo em maiúsculas (todos → TODAS)', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true, guias: [] }, error: null });
    await edgeFunctionsService.gerarGuias({ empresaId: 'emp-1', competencia: '2026-10', tipo: 'todos' });
    expect(mockInvoke).toHaveBeenCalledWith('gerar-guias', {
      body: { empresa_id: 'emp-1', competencia: '2026-10', tipo: 'TODAS' },
    });
  });

  it('mapeia fgts_digital para FGTS_DIGITAL', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
    await edgeFunctionsService.gerarGuias({ empresaId: 'emp-1', competencia: '2026-10', tipo: 'fgts_digital' });
    expect(mockInvoke.mock.calls[0][1].body.tipo).toBe('FGTS_DIGITAL');
  });

  // A edge `fgts-digital` (tabela guias_fgts_digital + protocolo GFD) ficou
  // órfã por várias ondas: existia hardening, faltava o chamador. Este teste
  // trava o contrato snake_case para que ela não volte a ficar sem consumidor.
  it('gerarGuiaFgtsDigital chama a edge dedicada com contrato snake_case', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, id: 'g1', protocolo: 'FGD-1', payload_sha256: 'a'.repeat(64) },
      error: null,
    });
    await edgeFunctionsService.gerarGuiaFgtsDigital({
      empresaId: '11111111-1111-4111-8111-111111111111',
      competencia: '2026-11',
      tipo: 'mensal',
      valorTotalCentavos: 12345,
      vencimento: '2026-12-20',
    });
    expect(mockInvoke).toHaveBeenCalledWith('fgts-digital', {
      // A chave estável (empresa+competência+tipo) viaja no header: é ela que
      // faz a edge reapresentar o registro em vez de reinserir a guia.
      headers: {
        'Idempotency-Key': 'fgts-digital:11111111-1111-4111-8111-111111111111:2026-11:mensal',
      },
      body: {
        empresa_id: '11111111-1111-4111-8111-111111111111',
        competencia: '2026-11',
        tipo: 'mensal',
        valor_total_centavos: 12345,
        vencimento: '2026-12-20',
      },
    });
  });
});
