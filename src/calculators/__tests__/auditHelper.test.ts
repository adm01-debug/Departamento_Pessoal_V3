import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuditLog } = vi.hoisted(() => ({
  mockAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: { log: mockAuditLog },
}));

import { signCalculation, auditCalculation, verifyCalculationIntegrity } from '../auditHelper';

describe('signCalculation', () => {
  it('returns a hex string', async () => {
    const hash = await signCalculation({ value: 42 });
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('returns the same hash for identical data', async () => {
    const data = { salario: 3000, inss: 300 };
    const h1 = await signCalculation(data);
    const h2 = await signCalculation(data);
    expect(h1).toBe(h2);
  });

  it('returns different hashes for different data', async () => {
    const h1 = await signCalculation({ value: 1 });
    const h2 = await signCalculation({ value: 2 });
    expect(h1).not.toBe(h2);
  });

  it('produces a 64-character SHA-256 hex string', async () => {
    const hash = await signCalculation({ test: true });
    expect(hash).toHaveLength(64);
  });
});

describe('auditCalculation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls auditLogger.log with correct tabela and acao', async () => {
    await auditCalculation('col-1', '2024-07', { proventos: 3000, descontos: 300, salarioLiquido: 2700 });
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ tabela: 'folhas_pagamento', acao: 'EXECUTE_CALC' })
    );
  });

  it('calls auditLogger.log with colaboradorId as registro_id', async () => {
    await auditCalculation('colaborador-abc', '2024-07', {});
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ registro_id: 'colaborador-abc' })
    );
  });

  it('returns a SHA-256 hex string (signature)', async () => {
    const sig = await auditCalculation('col-1', '2024-07', { salarioLiquido: 3000 });
    expect(typeof sig).toBe('string');
    expect(sig).toHaveLength(64);
  });

  it('includes integridade_calculo flag in dados_novos', async () => {
    await auditCalculation('col-1', '2024-07', {});
    const call = mockAuditLog.mock.calls[0][0];
    expect(call.dados_novos.integridade_calculo).toBe('ASSINADO_SHA256');
  });

  it('includes competencia in dados_novos', async () => {
    await auditCalculation('col-1', '2024-06', {});
    const call = mockAuditLog.mock.calls[0][0];
    expect(call.dados_novos.competencia).toBe('2024-06');
  });
});

describe('verifyCalculationIntegrity', () => {
  it('returns true when data matches original signature', async () => {
    const data = { total: 1000 };
    const sig = await signCalculation(data);
    const ok = await verifyCalculationIntegrity(data, sig);
    expect(ok).toBe(true);
  });

  it('returns false when data has been modified', async () => {
    const data = { total: 1000 };
    const sig = await signCalculation(data);
    const ok = await verifyCalculationIntegrity({ total: 1001 }, sig);
    expect(ok).toBe(false);
  });

  it('returns false for wrong signature', async () => {
    const ok = await verifyCalculationIntegrity({ val: 1 }, 'invalid-sig');
    expect(ok).toBe(false);
  });
});
