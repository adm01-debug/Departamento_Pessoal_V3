import { describe, it, expect } from 'vitest';
import { validarS2210, validarS2220, validarS2240 } from '../sstValidators';

const VALID_CPF = '11144477735';

// ─── S2210 (Comunicação de Acidente de Trabalho) ─────────────────────────────

describe('validarS2210', () => {
  it('returns valid for complete data', () => {
    const r = validarS2210({
      cpfTrab: VALID_CPF,
      dtAcid: '2024-05-10',
      tpAcid: '1',
      hrAcid: '08:30',
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('errors when cpfTrab is missing', () => {
    const r = validarS2210({ dtAcid: '2024-05-10', tpAcid: '1', hrAcid: '08:30' });
    expect(r.errors.some(e => e.campo === 'cpfTrab')).toBe(true);
  });

  it('errors for invalid CPF', () => {
    const r = validarS2210({ cpfTrab: '00000000000', dtAcid: '2024-05-10', tpAcid: '1', hrAcid: '08:30' });
    expect(r.errors.some(e => e.regra === 'REGRA_CPF')).toBe(true);
  });

  it('errors when dtAcid is missing', () => {
    const r = validarS2210({ cpfTrab: VALID_CPF, tpAcid: '1', hrAcid: '08:30' });
    expect(r.errors.some(e => e.campo === 'dtAcid')).toBe(true);
  });

  it('errors for invalid dtAcid', () => {
    const r = validarS2210({ cpfTrab: VALID_CPF, dtAcid: 'bad', tpAcid: '1', hrAcid: '08:30' });
    expect(r.errors.some(e => e.regra === 'REGRA_DATA')).toBe(true);
  });

  it('errors when tpAcid is missing', () => {
    const r = validarS2210({ cpfTrab: VALID_CPF, dtAcid: '2024-05-10', hrAcid: '08:30' });
    expect(r.errors.some(e => e.campo === 'tpAcid')).toBe(true);
  });

  it('errors for invalid tpAcid (not 1/2/3)', () => {
    const r = validarS2210({ cpfTrab: VALID_CPF, dtAcid: '2024-05-10', tpAcid: '9', hrAcid: '08:30' });
    expect(r.errors.some(e => e.regra === 'REGRA_ENUM')).toBe(true);
  });

  it('accepts tpAcid values 1, 2, 3', () => {
    for (const tpAcid of ['1', '2', '3']) {
      const r = validarS2210({ cpfTrab: VALID_CPF, dtAcid: '2024-05-10', tpAcid, hrAcid: '08:30' });
      expect(r.errors.some(e => e.campo === 'tpAcid')).toBe(false);
    }
  });

  it('errors when hrAcid is missing', () => {
    const r = validarS2210({ cpfTrab: VALID_CPF, dtAcid: '2024-05-10', tpAcid: '1' });
    expect(r.errors.some(e => e.campo === 'hrAcid')).toBe(true);
  });
});

// ─── S2220 (Monitoramento da Saúde do Trabalhador) ───────────────────────────

describe('validarS2220', () => {
  it('returns valid for complete data', () => {
    const r = validarS2220({
      cpfTrab: VALID_CPF,
      dtExame: '2024-03-20',
      tpExame: '0',
    });
    expect(r.valid).toBe(true);
  });

  it('errors when cpfTrab is missing', () => {
    const r = validarS2220({ dtExame: '2024-03-20', tpExame: '0' });
    expect(r.errors.some(e => e.campo === 'cpfTrab')).toBe(true);
  });

  it('errors when dtExame is missing', () => {
    const r = validarS2220({ cpfTrab: VALID_CPF, tpExame: '0' });
    expect(r.errors.some(e => e.campo === 'dtExame')).toBe(true);
  });

  it('errors for invalid dtExame', () => {
    const r = validarS2220({ cpfTrab: VALID_CPF, dtExame: 'not-a-date', tpExame: '0' });
    expect(r.errors.some(e => e.regra === 'REGRA_DATA')).toBe(true);
  });

  it('errors when tpExame is missing', () => {
    const r = validarS2220({ cpfTrab: VALID_CPF, dtExame: '2024-03-20' });
    expect(r.errors.some(e => e.campo === 'tpExame')).toBe(true);
  });

  it('errors for invalid tpExame', () => {
    const r = validarS2220({ cpfTrab: VALID_CPF, dtExame: '2024-03-20', tpExame: '5' });
    expect(r.errors.some(e => e.regra === 'REGRA_ENUM')).toBe(true);
  });

  it('accepts all valid tpExame values (0/1/2/3/4/9)', () => {
    for (const tpExame of ['0', '1', '2', '3', '4', '9']) {
      const r = validarS2220({ cpfTrab: VALID_CPF, dtExame: '2024-03-20', tpExame });
      expect(r.errors.some(e => e.campo === 'tpExame')).toBe(false);
    }
  });
});

// ─── S2240 (Condições Ambientais do Trabalho) ────────────────────────────────

describe('validarS2240', () => {
  it('returns valid for complete data without infoExpRisco', () => {
    const r = validarS2240({ cpfTrab: VALID_CPF, dtIniCondic: '2024-01-01' });
    expect(r.valid).toBe(true);
  });

  it('returns valid with empty infoExpRisco array', () => {
    const r = validarS2240({ cpfTrab: VALID_CPF, dtIniCondic: '2024-01-01', infoExpRisco: [] });
    expect(r.valid).toBe(true);
  });

  it('errors when cpfTrab is missing', () => {
    const r = validarS2240({ dtIniCondic: '2024-01-01' });
    expect(r.errors.some(e => e.campo === 'cpfTrab')).toBe(true);
  });

  it('errors when dtIniCondic is missing', () => {
    const r = validarS2240({ cpfTrab: VALID_CPF });
    expect(r.errors.some(e => e.campo === 'dtIniCondic')).toBe(true);
  });

  it('errors for invalid dtIniCondic', () => {
    const r = validarS2240({ cpfTrab: VALID_CPF, dtIniCondic: 'invalid' });
    expect(r.errors.some(e => e.regra === 'REGRA_DATA')).toBe(true);
  });

  it('errors when infoExpRisco item is missing codAgNoc', () => {
    const r = validarS2240({
      cpfTrab: VALID_CPF,
      dtIniCondic: '2024-01-01',
      infoExpRisco: [{ codAgNoc: null }],
    });
    expect(r.errors.some(e => e.campo === 'infoExpRisco[0].codAgNoc')).toBe(true);
  });

  it('returns valid when infoExpRisco items have codAgNoc', () => {
    const r = validarS2240({
      cpfTrab: VALID_CPF,
      dtIniCondic: '2024-01-01',
      infoExpRisco: [{ codAgNoc: '01.01.001' }, { codAgNoc: '02.01.001' }],
    });
    expect(r.valid).toBe(true);
  });

  it('errors for each infoExpRisco item missing codAgNoc', () => {
    const r = validarS2240({
      cpfTrab: VALID_CPF,
      dtIniCondic: '2024-01-01',
      infoExpRisco: [{ codAgNoc: null }, { codAgNoc: null }],
    });
    const missing = r.errors.filter(e => e.campo.startsWith('infoExpRisco'));
    expect(missing).toHaveLength(2);
  });
});
