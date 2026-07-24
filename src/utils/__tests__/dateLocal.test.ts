import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatDateLocalISO, todayLocalISO, addDaysLocal, formatCompetenciaLocal, currentCompetenciaLocal } from '../dateLocal';

describe('dateLocal', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formata YYYY-MM-DD com zero-padding no fuso local', () => {
    // 5 de março de 2026 às 00:00 LOCAL — nunca deve virar 04-03 nem 06-03.
    const d = new Date(2026, 2, 5, 0, 0, 0);
    expect(formatDateLocalISO(d)).toBe('2026-03-05');
  });

  it('não sofre shift de UTC quando a hora local é próxima da meia-noite', () => {
    // 12/07/2026 às 23:30 no fuso local. toISOString() daria 13/07 se
    // o fuso local for negativo (ex.: America/Sao_Paulo em UTC-3).
    const d = new Date(2026, 6, 12, 23, 30, 0);
    const [year, month, day] = formatDateLocalISO(d).split('-');
    expect(year).toBe('2026');
    expect(month).toBe('07');
    expect(day).toBe('12');
  });

  it('retorna string vazia para entrada inválida (contrato defensivo)', () => {
    expect(formatDateLocalISO(new Date('nada disso'))).toBe('');
    // @ts-expect-error — teste de robustez contra caller mal comportado
    expect(formatDateLocalISO(null)).toBe('');
  });

  it('todayLocalISO usa a data mockada', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 10));
    expect(todayLocalISO()).toBe('2026-01-15');
  });

  it('addDaysLocal soma preservando fuso local em cruzamento de mês', () => {
    const base = new Date(2026, 0, 30, 12, 0, 0);
    expect(formatDateLocalISO(addDaysLocal(base, 5))).toBe('2026-02-04');
  });

  it('addDaysLocal aceita valores negativos', () => {
    const base = new Date(2026, 0, 3, 12, 0, 0);
    expect(formatDateLocalISO(addDaysLocal(base, -5))).toBe('2025-12-29');
  });
});

describe('formatCompetenciaLocal', () => {
  it('formata YYYY-MM no fuso local', () => {
    const d = new Date(2026, 6, 1, 12, 0, 0); // julho 2026
    expect(formatCompetenciaLocal(d)).toBe('2026-07');
  });

  it('usa zero-padding para meses < 10', () => {
    const d = new Date(2026, 2, 15, 12, 0, 0); // março 2026
    expect(formatCompetenciaLocal(d)).toBe('2026-03');
  });

  it('retorna string vazia para data inválida', () => {
    expect(formatCompetenciaLocal(new Date('invalid'))).toBe('');
  });

  it('não sofre shift em cruzamento de fim de mês (23:30 local)', () => {
    // 31/07 às 23:30 em UTC-3 seria 01/08 em UTC — competência deve ser 07
    const d = new Date(2026, 6, 31, 23, 30, 0); // julho
    const result = formatCompetenciaLocal(d);
    const [year, month] = result.split('-');
    expect(year).toBe('2026');
    expect(month).toBe('07');
  });
});

describe('currentCompetenciaLocal', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna a competência atual usando data mockada', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15, 10)); // maio 2026
    expect(currentCompetenciaLocal()).toBe('2026-05');
  });

  it('formato YYYY-MM (8 chars)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 1)); // dezembro 2026
    expect(currentCompetenciaLocal()).toMatch(/^\d{4}-\d{2}$/);
  });
});
