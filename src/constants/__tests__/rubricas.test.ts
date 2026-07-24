import { describe, it, expect } from 'vitest';
import { RUBRICAS_PADRAO } from '../rubricas';

describe('RUBRICAS_PADRAO', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(RUBRICAS_PADRAO)).toBe(true);
    expect(RUBRICAS_PADRAO.length).toBeGreaterThan(0);
  });

  it('has no duplicate codigos', () => {
    const codigos = RUBRICAS_PADRAO.map(r => r.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it('each rubrica has required fields', () => {
    for (const r of RUBRICAS_PADRAO) {
      expect(typeof r.codigo).toBe('string');
      expect(r.codigo.length).toBeGreaterThan(0);
      expect(typeof r.descricao).toBe('string');
      expect(['provento', 'desconto', 'informativa']).toContain(r.tipo);
      expect(typeof r.incide_inss).toBe('boolean');
      expect(typeof r.incide_irrf).toBe('boolean');
      expect(typeof r.incide_fgts).toBe('boolean');
    }
  });

  it('has salary base rubrica (1000)', () => {
    const base = RUBRICAS_PADRAO.find(r => r.codigo === '1000');
    expect(base).toBeDefined();
    expect(base?.tipo).toBe('provento');
    expect(base?.incide_inss).toBe(true);
    expect(base?.incide_irrf).toBe(true);
    expect(base?.incide_fgts).toBe(true);
  });

  it('has INSS discount rubrica (5000) with no incidence flags', () => {
    const inss = RUBRICAS_PADRAO.find(r => r.codigo === '5000');
    expect(inss).toBeDefined();
    expect(inss?.tipo).toBe('desconto');
    expect(inss?.incide_inss).toBe(false);
    expect(inss?.incide_irrf).toBe(false);
    expect(inss?.incide_fgts).toBe(false);
  });

  it('Salário Família (1007) has no incidence (isenção legal)', () => {
    const sf = RUBRICAS_PADRAO.find(r => r.codigo === '1007');
    expect(sf).toBeDefined();
    expect(sf?.incide_inss).toBe(false);
    expect(sf?.incide_irrf).toBe(false);
    expect(sf?.incide_fgts).toBe(false);
  });

  it('FGTS informativa (7000) has tipo informativa', () => {
    const fgts = RUBRICAS_PADRAO.find(r => r.codigo === '7000');
    expect(fgts).toBeDefined();
    expect(fgts?.tipo).toBe('informativa');
  });

  it('desconto rubrics have tipo = desconto', () => {
    const descontos = RUBRICAS_PADRAO.filter(r => r.codigo.startsWith('5'));
    expect(descontos.length).toBeGreaterThan(0);
    for (const d of descontos) {
      expect(d.tipo).toBe('desconto');
    }
  });

  it('all proventos have codigo starting with 1', () => {
    const proventos = RUBRICAS_PADRAO.filter(r => r.tipo === 'provento');
    for (const p of proventos) {
      expect(p.codigo).toMatch(/^1/);
    }
  });
});
