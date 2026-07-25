import { describe, it, expect } from 'vitest';
import {
  validarS2190,
  validarS2200,
  validarS2205,
  validarS2206,
  validarS2230,
  validarS2299,
  validarS2300,
  validarS2306,
  validarS2399,
  validarS2400,
  validarS3000,
} from '../naoPeriodicosValidators';

const VALID_CPF = '11144477735';

// ─── S2190 ───────────────────────────────────────────────────────────────────

describe('validarS2190', () => {
  it('returns valid for complete data', () => {
    const r = validarS2190({ cpfTrab: VALID_CPF, dtAdm: '2024-01-15' });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('errors when cpfTrab is missing', () => {
    const r = validarS2190({ dtAdm: '2024-01-15' });
    const campo = r.errors.map(e => e.campo);
    expect(campo).toContain('cpfTrab');
  });

  it('errors when dtAdm is missing', () => {
    const r = validarS2190({ cpfTrab: VALID_CPF });
    const campo = r.errors.map(e => e.campo);
    expect(campo).toContain('dtAdm');
  });

  it('errors for invalid CPF', () => {
    const r = validarS2190({ cpfTrab: '00000000000', dtAdm: '2024-01-15' });
    expect(r.errors.some(e => e.regra === 'REGRA_CPF')).toBe(true);
  });

  it('errors for invalid date', () => {
    const r = validarS2190({ cpfTrab: VALID_CPF, dtAdm: 'bad-date' });
    expect(r.errors.some(e => e.regra === 'REGRA_DATA')).toBe(true);
  });
});

// ─── S2200 ───────────────────────────────────────────────────────────────────

describe('validarS2200', () => {
  it('returns valid for complete data', () => {
    const r = validarS2200({ cpfTrab: VALID_CPF, nmTrab: 'João', dtAdm: '2024-01-15' });
    expect(r.valid).toBe(true);
  });

  it('errors when nmTrab is missing', () => {
    const r = validarS2200({ cpfTrab: VALID_CPF, dtAdm: '2024-01-15' });
    expect(r.errors.some(e => e.campo === 'nmTrab')).toBe(true);
  });

  it('errors when cpfTrab missing', () => {
    const r = validarS2200({ nmTrab: 'João', dtAdm: '2024-01-15' });
    expect(r.errors.some(e => e.campo === 'cpfTrab')).toBe(true);
  });
});

// ─── S2205 ───────────────────────────────────────────────────────────────────

describe('validarS2205', () => {
  it('returns valid with valid CPF', () => {
    const r = validarS2205({ cpfTrab: VALID_CPF });
    expect(r.valid).toBe(true);
  });

  it('errors when cpfTrab is missing', () => {
    const r = validarS2205({});
    expect(r.errors.some(e => e.campo === 'cpfTrab')).toBe(true);
  });
});

// ─── S2206 ───────────────────────────────────────────────────────────────────

describe('validarS2206', () => {
  it('returns valid for complete data', () => {
    const r = validarS2206({ cpfTrab: VALID_CPF, dtAlteracao: '2024-03-01' });
    expect(r.valid).toBe(true);
  });

  it('errors when dtAlteracao is missing', () => {
    const r = validarS2206({ cpfTrab: VALID_CPF });
    expect(r.errors.some(e => e.campo === 'dtAlteracao')).toBe(true);
  });
});

// ─── S2230 ───────────────────────────────────────────────────────────────────

describe('validarS2230', () => {
  it('returns valid for complete data', () => {
    const r = validarS2230({ cpfTrab: VALID_CPF, codMotAfast: '01', dtIniAfast: '2024-06-01' });
    expect(r.valid).toBe(true);
  });

  it('errors when codMotAfast is missing', () => {
    const r = validarS2230({ cpfTrab: VALID_CPF, dtIniAfast: '2024-06-01' });
    expect(r.errors.some(e => e.campo === 'codMotAfast')).toBe(true);
  });

  it('errors when dtIniAfast is missing', () => {
    const r = validarS2230({ cpfTrab: VALID_CPF, codMotAfast: '01' });
    expect(r.errors.some(e => e.campo === 'dtIniAfast')).toBe(true);
  });
});

// ─── S2299 ───────────────────────────────────────────────────────────────────

describe('validarS2299', () => {
  it('returns valid for complete data', () => {
    const r = validarS2299({ cpfTrab: VALID_CPF, dtDeslig: '2024-12-31' });
    expect(r.valid).toBe(true);
  });

  it('errors when dtDeslig is missing', () => {
    const r = validarS2299({ cpfTrab: VALID_CPF });
    expect(r.errors.some(e => e.campo === 'dtDeslig')).toBe(true);
  });
});

// ─── S2300 ───────────────────────────────────────────────────────────────────

describe('validarS2300', () => {
  it('returns valid for complete data', () => {
    const r = validarS2300({ cpfTrab: VALID_CPF, dtInicio: '2024-02-01' });
    expect(r.valid).toBe(true);
  });

  it('errors when dtInicio is missing', () => {
    const r = validarS2300({ cpfTrab: VALID_CPF });
    expect(r.errors.some(e => e.campo === 'dtInicio')).toBe(true);
  });
});

// ─── S2306 ───────────────────────────────────────────────────────────────────

describe('validarS2306', () => {
  it('returns valid with valid CPF', () => {
    const r = validarS2306({ cpfTrab: VALID_CPF });
    expect(r.valid).toBe(true);
  });

  it('errors when cpfTrab is missing', () => {
    const r = validarS2306({});
    expect(r.errors.some(e => e.campo === 'cpfTrab')).toBe(true);
  });
});

// ─── S2399 ───────────────────────────────────────────────────────────────────

describe('validarS2399', () => {
  it('returns valid for complete data', () => {
    const r = validarS2399({ cpfTrab: VALID_CPF, dtTerm: '2024-11-30' });
    expect(r.valid).toBe(true);
  });

  it('errors when dtTerm is missing', () => {
    const r = validarS2399({ cpfTrab: VALID_CPF });
    expect(r.errors.some(e => e.campo === 'dtTerm')).toBe(true);
  });
});

// ─── S2400 ───────────────────────────────────────────────────────────────────

describe('validarS2400', () => {
  it('returns valid with valid CPF', () => {
    const r = validarS2400({ cpfTrab: VALID_CPF });
    expect(r.valid).toBe(true);
  });

  it('errors when cpfTrab is missing', () => {
    const r = validarS2400({});
    expect(r.errors.some(e => e.campo === 'cpfTrab')).toBe(true);
  });
});

// ─── S3000 ───────────────────────────────────────────────────────────────────

describe('validarS3000', () => {
  it('returns valid for complete data', () => {
    const r = validarS3000({ nrRecEvt: 'REC001', tpEvt: 'S-1000' });
    expect(r.valid).toBe(true);
  });

  it('errors when nrRecEvt is missing', () => {
    const r = validarS3000({ tpEvt: 'S-1000' });
    expect(r.errors.some(e => e.campo === 'nrRecEvt')).toBe(true);
  });

  it('errors when tpEvt is missing', () => {
    const r = validarS3000({ nrRecEvt: 'REC001' });
    expect(r.errors.some(e => e.campo === 'tpEvt')).toBe(true);
  });
});
