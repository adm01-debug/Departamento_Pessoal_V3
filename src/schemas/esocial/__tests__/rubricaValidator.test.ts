import { describe, it, expect, vi } from 'vitest';

vi.mock('@/constants/rubricas', () => ({
  RUBRICAS_PADRAO: [
    {
      codigo: 'SAL001',
      descricao: 'Salário Base',
      tipo: 'provento',
      incide_inss: true,
      incide_fgts: true,
      incide_irrf: true,
    },
  ],
}));

import { validarRubricaESocial, sugerirCorrecaoRubrica } from '../rubricaValidator';

// ─── validarRubricaESocial ───────────────────────────────────────────────────

describe('validarRubricaESocial', () => {
  it('returns valid for unknown codigo with correct required fields', () => {
    const r = validarRubricaESocial({ codigo: 'CUSTOM001', descricao: 'Custom', tipo: 'provento' });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('errors when codigo is missing', () => {
    const r = validarRubricaESocial({ descricao: 'X', tipo: 'provento' });
    expect(r.errors.some(e => e.campo === 'codigo')).toBe(true);
    expect(r.valid).toBe(false);
  });

  it('errors when descricao is missing', () => {
    const r = validarRubricaESocial({ codigo: 'X', tipo: 'provento' });
    expect(r.errors.some(e => e.campo === 'descricao')).toBe(true);
  });

  it('errors when tipo is missing', () => {
    const r = validarRubricaESocial({ codigo: 'X', descricao: 'X' });
    expect(r.errors.some(e => e.campo === 'tipo')).toBe(true);
  });

  it('errors when tipo is invalid enum value', () => {
    const r = validarRubricaESocial({ codigo: 'X', descricao: 'X', tipo: 'invalido' });
    expect(r.errors.some(e => e.regra === 'REGRA_ENUM')).toBe(true);
  });

  it('accepts all valid tipo values', () => {
    for (const tipo of ['provento', 'desconto', 'informativa', 'informativo']) {
      const r = validarRubricaESocial({ codigo: 'X', descricao: 'X', tipo });
      expect(r.errors.some(e => e.regra === 'REGRA_ENUM')).toBe(false);
    }
  });

  it('returns valid when known codigo matches padrao exactly', () => {
    const r = validarRubricaESocial({
      codigo: 'SAL001',
      descricao: 'Qualquer',
      tipo: 'provento',
      incide_inss: true,
      incide_fgts: true,
      incide_irrf: true,
    });
    expect(r.valid).toBe(true);
  });

  it('errors when tipo diverges from padrao for known codigo', () => {
    const r = validarRubricaESocial({
      codigo: 'SAL001',
      descricao: 'X',
      tipo: 'desconto',
      incide_inss: true,
      incide_fgts: true,
      incide_irrf: true,
    });
    expect(r.errors.some(e => e.regra === 'REGRA_DIVERGENCIA_ESOCIAL')).toBe(true);
    expect(r.valid).toBe(false);
  });

  it('errors when incide_inss diverges from padrao', () => {
    const r = validarRubricaESocial({
      codigo: 'SAL001',
      descricao: 'X',
      tipo: 'provento',
      incide_inss: false,
      incide_fgts: true,
      incide_irrf: true,
    });
    expect(r.errors.some(e => e.campo === 'incide_inss' && e.regra === 'REGRA_INCIDENCIA')).toBe(true);
  });

  it('errors when incide_fgts diverges from padrao', () => {
    const r = validarRubricaESocial({
      codigo: 'SAL001',
      descricao: 'X',
      tipo: 'provento',
      incide_inss: true,
      incide_fgts: false,
      incide_irrf: true,
    });
    expect(r.errors.some(e => e.campo === 'incide_fgts' && e.regra === 'REGRA_INCIDENCIA')).toBe(true);
  });

  it('errors when incide_irrf diverges from padrao', () => {
    const r = validarRubricaESocial({
      codigo: 'SAL001',
      descricao: 'X',
      tipo: 'provento',
      incide_inss: true,
      incide_fgts: true,
      incide_irrf: false,
    });
    expect(r.errors.some(e => e.campo === 'incide_irrf' && e.regra === 'REGRA_INCIDENCIA')).toBe(true);
  });
});

// ─── sugerirCorrecaoRubrica ──────────────────────────────────────────────────

describe('sugerirCorrecaoRubrica', () => {
  it('returns null when codigo is not in RUBRICAS_PADRAO', () => {
    expect(sugerirCorrecaoRubrica({ codigo: 'UNKNOWN', descricao: 'X', tipo: 'desconto' })).toBeNull();
  });

  it('returns corrected rubrica for known codigo', () => {
    const suggestion = sugerirCorrecaoRubrica({
      codigo: 'SAL001',
      descricao: 'Errado',
      tipo: 'desconto',
      incide_inss: false,
      incide_fgts: false,
      incide_irrf: false,
    });
    expect(suggestion).not.toBeNull();
    expect(suggestion!.tipo).toBe('provento');
    expect(suggestion!.incide_inss).toBe(true);
    expect(suggestion!.incide_fgts).toBe(true);
    expect(suggestion!.incide_irrf).toBe(true);
    expect(suggestion!.descricao).toBe('Salário Base');
  });

  it('preserves non-standard fields in suggestion', () => {
    const suggestion = sugerirCorrecaoRubrica({
      codigo: 'SAL001',
      descricao: 'X',
      tipo: 'desconto',
      customField: 'preserved',
    });
    expect(suggestion!.customField).toBe('preserved');
  });
});
