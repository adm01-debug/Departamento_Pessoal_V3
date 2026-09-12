/**
 * Unit tests for contratacaoService methods beyond gerarTemplateContrato.

 * (XSS/security tests for gerarTemplateContrato live in contratacaoService.xss.test.ts)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';

const EMPRESA_ID = 'test-empresa-id';

const { mockFrom, mockLog, mockClaimEvento, mockCompleteEvento, mockFailEvento, mockEnviarEvento } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLog: vi.fn(),
  mockClaimEvento: vi.fn(),
  mockCompleteEvento: vi.fn(),
  mockFailEvento: vi.fn(),
  mockEnviarEvento: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: { log: mockLog },
}));

vi.mock('../esocialService', () => ({
  claimEventoAdmissaoESocial: mockClaimEvento,
  completeEventoAdmissaoESocial: mockCompleteEvento,
  failEventoAdmissaoESocial: mockFailEvento,
  enviarEvento: mockEnviarEvento,
}));

// Dynamic import after mocks are registered
const { contratacaoService } = await import('../contratacaoService');

// ─── validarDocumento ─────────────────────────────────────────────────────────

describe('contratacaoService.validarDocumento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLog.mockResolvedValue(undefined);
  });

  function setupUpdateEqChain(error: any = null) {
    const eqFn = vi.fn().mockResolvedValue({ error });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ update: updateFn });
    return { updateFn, eqFn };
  }

  it('updates admissao document status and logs audit', async () => {
    const { updateFn, eqFn } = setupUpdateEqChain();
    await contratacaoService.validarDocumento('adm-1', 'rg', 'validado', 'Ok', EMPRESA_ID);
    expect(mockFrom).toHaveBeenCalledWith('admissoes');
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        checklist_rg: true,
      })
    );
    expect(eqFn).toHaveBeenCalledWith('id', 'adm-1');
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tabela: 'admissoes',
        registro_id: 'adm-1',
        acao: 'UPDATE',
      })
    );
  });

  it('sets document flag false when status is rejeitado', async () => {
    const { updateFn } = setupUpdateEqChain();
    await contratacaoService.validarDocumento('adm-1', 'cnh', 'rejeitado', undefined, EMPRESA_ID);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        checklist_cnh: false,
      })
    );
  });

  it('throws wrapped error on DB failure', async () => {
    setupUpdateEqChain({ message: 'DB fail' });
    await expect(contratacaoService.validarDocumento('adm-1', 'rg', 'validado', 'Ok', EMPRESA_ID)).rejects.toThrow(
      'Falha ao validar documento de admissão'
    );
  });
});

// ─── enviarLinkCandidato ──────────────────────────────────────────────────────

describe('contratacaoService.enviarLinkCandidato', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        admissao_id: 'adm-1',
        email_candidato: 'a@b.com',
      })
    );
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockClaimEvento.mockResolvedValue({ eventoId: 'evento-1', claimToken: 'claim-1', alreadySent: false });
    mockCompleteEvento.mockResolvedValue(undefined);
    mockFailEvento.mockResolvedValue('failed');
    mockEnviarEvento.mockResolvedValue({ success: true, protocolo: 'PROTO-REAL', recibo: 'REC-REAL' });
  });

  it('reutiliza a identidade reivindicada atomicamente e só conclui com recibo verificável', async () => {
    const result = await contratacaoService.transmitirESocial('adm-1', EMPRESA_ID);

    expect(result).toBe(true);
    expect(mockClaimEvento).toHaveBeenCalledWith('adm-1', EMPRESA_ID);
    expect(mockEnviarEvento).toHaveBeenCalledWith('evento-1', EMPRESA_ID, 'claim-1');
    expect(mockCompleteEvento).toHaveBeenCalledWith(
      'adm-1',
      EMPRESA_ID,
      'evento-1',
      'claim-1',
      'PROTO-REAL',
      'REC-REAL'
    );
    expect(mockFailEvento).not.toHaveBeenCalled();
  });

  it('não avança e recupera o status quando o provedor não devolve recibo', async () => {
    mockEnviarEvento.mockResolvedValueOnce({ success: true, protocolo: null, recibo: null });

    await expect(contratacaoService.transmitirESocial('adm-1', EMPRESA_ID)).rejects.toThrow(
      'Falha na transmissão para o eSocial'
    );
    expect(mockCompleteEvento).not.toHaveBeenCalled();
    expect(mockFailEvento).toHaveBeenCalledWith('adm-1', EMPRESA_ID, 'evento-1', 'claim-1');
  });

  it('recupera o status quando o transporte falha e preserva a causa original', async () => {
    mockEnviarEvento.mockRejectedValueOnce(new Error('transport unavailable'));
    mockFailEvento.mockRejectedValueOnce(new Error('recovery unavailable'));

    await expect(contratacaoService.transmitirESocial('adm-1', EMPRESA_ID)).rejects.toThrow(
      'Falha na transmissão para o eSocial'
    );
    expect(mockFailEvento).toHaveBeenCalledWith('adm-1', EMPRESA_ID, 'evento-1', 'claim-1');
  });

  it('não tenta recuperar sem uma identidade de evento confirmada pelo banco', async () => {
    mockClaimEvento.mockRejectedValueOnce(new Error('admission outside scope'));
    await expect(contratacaoService.transmitirESocial('adm-1', EMPRESA_ID)).rejects.toThrow(
      'Falha na transmissão para o eSocial'
    );
    expect(mockEnviarEvento).not.toHaveBeenCalled();
    expect(mockFailEvento).not.toHaveBeenCalled();
  });

  it('rejeita simulação como conclusão real e marca a admissão com erro', async () => {
    mockEnviarEvento.mockResolvedValueOnce({ success: true, simulated: true, protocolo: 'SANDBOX', recibo: null });
    await expect(contratacaoService.transmitirESocial('adm-1', EMPRESA_ID)).rejects.toThrow(
      'Falha na transmissão para o eSocial'
    );
    expect(mockCompleteEvento).not.toHaveBeenCalled();
    expect(mockFailEvento).toHaveBeenCalledWith('adm-1', EMPRESA_ID, 'evento-1', 'claim-1');
  });

  it('trata uma admissão já concluída por concorrente como sucesso idempotente', async () => {
    mockClaimEvento.mockResolvedValueOnce({ eventoId: 'evento-1', claimToken: null, alreadySent: true });
    await expect(contratacaoService.transmitirESocial('adm-1', EMPRESA_ID)).resolves.toBe(true);
    expect(mockEnviarEvento).not.toHaveBeenCalled();
  });

  it('trata conclusão concorrente detectada na recuperação como sucesso', async () => {
    mockEnviarEvento.mockRejectedValueOnce(new Error('timeout'));
    mockFailEvento.mockResolvedValueOnce('already_sent');
    await expect(contratacaoService.transmitirESocial('adm-1', EMPRESA_ID)).resolves.toBe(true);
  });
});
