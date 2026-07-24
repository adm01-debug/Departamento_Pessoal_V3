/**
 * Unit tests for contratacaoService methods beyond gerarTemplateContrato.
 * (XSS/security tests for gerarTemplateContrato live in contratacaoService.xss.test.ts)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockLog } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLog: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: { log: mockLog },
}));

// Dynamic import after mocks are registered
const { contratacaoService } = await import('../contratacaoService');

// ─── validarDocumento ─────────────────────────────────────────────────────────

describe('contratacaoService.validarDocumento', () => {
  beforeEach(() => { vi.clearAllMocks(); mockLog.mockResolvedValue(undefined); });

  function setupUpdateEqChain(error: any = null) {
    const eqFn = vi.fn().mockResolvedValue({ error });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ update: updateFn });
    return { updateFn, eqFn };
  }

  it('updates admissao document status and logs audit', async () => {
    const { updateFn, eqFn } = setupUpdateEqChain();
    await contratacaoService.validarDocumento('adm-1', 'identidade', 'validado', 'Ok');
    expect(mockFrom).toHaveBeenCalledWith('admissoes');
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({
      checklist_identidade: true,
    }));
    expect(eqFn).toHaveBeenCalledWith('id', 'adm-1');
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({
      tabela: 'admissoes',
      registro_id: 'adm-1',
      acao: 'UPDATE',
    }));
  });

  it('sets document flag false when status is rejeitado', async () => {
    const { updateFn } = setupUpdateEqChain();
    await contratacaoService.validarDocumento('adm-1', 'cnh', 'rejeitado');
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({
      checklist_cnh: false,
    }));
  });

  it('throws wrapped error on DB failure', async () => {
    setupUpdateEqChain({ message: 'DB fail' });
    await expect(
      contratacaoService.validarDocumento('adm-1', 'identidade', 'validado')
    ).rejects.toThrow('Falha ao validar documento de admissão');
  });
});

// ─── enviarLinkCandidato ──────────────────────────────────────────────────────

describe('contratacaoService.enviarLinkCandidato', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  function setupInsertSingleChain(data: any, error: any = null) {
    const singleFn = vi.fn().mockResolvedValue({ data, error });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });
    return { insertFn, singleFn };
  }

  it('inserts token record and returns data', async () => {
    const tokenRecord = { id: 'tok-1', admissao_id: 'adm-1', email_candidato: 'a@b.com' };
    const { insertFn } = setupInsertSingleChain(tokenRecord);

    const result = await contratacaoService.enviarLinkCandidato('adm-1', 'a@b.com');

    expect(mockFrom).toHaveBeenCalledWith('admissao_tokens');
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      admissao_id: 'adm-1',
      email_candidato: 'a@b.com',
    }));
    expect(result).toEqual(tokenRecord);
  });

  it('generates a non-empty token string', async () => {
    let capturedPayload: any;
    const singleFn = vi.fn().mockResolvedValue({ data: {}, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockImplementation((payload) => {
      capturedPayload = payload;
      return { select: selectFn };
    });
    mockFrom.mockReturnValue({ insert: insertFn });

    await contratacaoService.enviarLinkCandidato('adm-1', 'a@b.com');
    expect(typeof capturedPayload.token).toBe('string');
    expect(capturedPayload.token.length).toBeGreaterThan(0);
  });

  it('throws on DB error', async () => {
    setupInsertSingleChain(null, { message: 'fail' });
    await expect(contratacaoService.enviarLinkCandidato('adm-1', 'a@b.com')).rejects.toBeDefined();
  });
});

// ─── transmitirESocial ────────────────────────────────────────────────────────

describe('contratacaoService.transmitirESocial', () => {
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLog.mockResolvedValue(undefined);
    // Make setTimeout fire immediately so tests don't wait 2 s
    setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 0 as any;
    });
  });

  afterEach(() => { setTimeoutSpy.mockRestore(); });

  it('returns true and logs eSocial transmission', async () => {
    const admissao = { id: 'adm-1', nome_completo: 'João' };

    const singleFn = vi.fn().mockResolvedValue({ data: admissao, error: null });
    const eqSelect = vi.fn().mockReturnValue({ single: singleFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqSelect });

    const eqUpdate = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqUpdate });

    mockFrom
      .mockReturnValueOnce({ select: selectFn })
      .mockReturnValueOnce({ update: updateFn });

    const result = await contratacaoService.transmitirESocial('adm-1');

    expect(result).toBe(true);
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ etapa: 'esocial' }));
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({
      tabela: 'admissoes',
      registro_id: 'adm-1',
      acao: 'EXECUTE_CALC',
    }));
  });

  it('throws wrapped error on update failure', async () => {
    const singleFn = vi.fn().mockResolvedValue({ data: {}, error: null });
    const eqSelect = vi.fn().mockReturnValue({ single: singleFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqSelect });

    const eqUpdate = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    const updateFn = vi.fn().mockReturnValue({ eq: eqUpdate });

    mockFrom
      .mockReturnValueOnce({ select: selectFn })
      .mockReturnValueOnce({ update: updateFn });

    await expect(contratacaoService.transmitirESocial('adm-1')).rejects.toThrow(
      'Falha na transmissão para o eSocial'
    );
  });
});
