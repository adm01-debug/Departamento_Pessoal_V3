import { describe, it, expect } from 'vitest';
import {
  parseDateSafe,
  formatDate,
  formatDateTime,
  formatDateLong,
  formatCompetencia,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatCPF,
  formatCNPJ,
} from '../format';

describe('format — resiliência a entradas inválidas', () => {
  it.each([null, undefined, '', 'not-a-date', NaN])('formatDate(%p) → fallback', (v) => {
    expect(formatDate(v as any)).toBe('—');
  });

  it.each([null, undefined, '', NaN, Infinity, -Infinity, 'abc'])(
    'formatCurrency(%p) → fallback',
    (v) => {
      expect(formatCurrency(v as any)).toBe('—');
    },
  );

  it('respeita fallback customizado', () => {
    expect(formatDate(null, 'N/D')).toBe('N/D');
    expect(formatCurrency(null, 'N/D')).toBe('N/D');
  });
});

describe('format — datas', () => {
  it('YYYY-MM-DD é tratado como data local (sem shift UTC)', () => {
    // Bug clássico: `new Date('2026-07-15')` em UTC-3 vira 14/07. Nosso parser evita.
    expect(formatDate('2026-07-15')).toBe('15/07/2026');
  });

  it('Date com meio-dia UTC não faz shift de dia', () => {
    // Usa 15:00 UTC → 12:00 America/Sao_Paulo, seguro de shift em qualquer runtime
    expect(formatDate(new Date(Date.UTC(2026, 6, 15, 15, 0)))).toBe('15/07/2026');
  });

  it('timestamp numérico formatado corretamente', () => {
    const ts = Date.UTC(2026, 6, 15, 15, 0);
    expect(formatDate(ts)).toBe('15/07/2026');
  });

  it('formatDateTime inclui hora e minuto no fuso BR', () => {
    // 17:32 UTC = 14:32 America/Sao_Paulo
    const d = new Date(Date.UTC(2026, 6, 15, 17, 32));
    expect(formatDateTime(d)).toMatch(/15\/07\/2026.*14:32/);
  });

  it('formatDateLong por extenso em pt-BR', () => {
    expect(formatDateLong('2026-07-15')).toContain('julho');
  });

  it('formatCompetencia aceita YYYY-MM', () => {
    expect(formatCompetencia('2026-07')).toBe('07/2026');
  });
});

describe('format — parseDateSafe', () => {
  it('rejeita Date inválido', () => {
    expect(parseDateSafe(new Date('invalid'))).toBeNull();
  });
  it('rejeita string malformada', () => {
    expect(parseDateSafe('lol')).toBeNull();
  });
});

describe('format — números e moeda', () => {
  it('formatCurrency zero', () => {
    expect(formatCurrency(0)).toMatch(/R\$.*0,00/);
  });
  it('formatCurrency valor grande', () => {
    expect(formatCurrency(1234567.89)).toMatch(/1\.234\.567,89/);
  });
  it('formatCurrency negativo', () => {
    expect(formatCurrency(-50)).toMatch(/-.*R\$|R\$.*-/);
  });
  it('formatCurrency string numérica', () => {
    expect(formatCurrency('99.5')).toMatch(/99,50/);
  });
  it('formatNumber com decimais custom', () => {
    expect(formatNumber(3.14159, { decimals: 3 })).toBe('3,142');
  });
  it('formatPercent normaliza fração', () => {
    expect(formatPercent(0.1234)).toMatch(/12,34\s*%/);
  });
  it('formatPercent aceita já-em-percent', () => {
    expect(formatPercent(12.34, { alreadyPercent: true })).toMatch(/12,34\s*%/);
  });
});

describe('format — documentos', () => {
  it('formatCPF aplica máscara', () => {
    expect(formatCPF('12345678900')).toBe('123.456.789-00');
  });
  it('formatCPF ignora não-dígitos', () => {
    expect(formatCPF('123.456.789-00')).toBe('123.456.789-00');
  });
  it('formatCNPJ aplica máscara', () => {
    expect(formatCNPJ('12345678000190')).toBe('12.345.678/0001-90');
  });
  it('formatCPF fallback quando vazio', () => {
    expect(formatCPF('')).toBe('—');
  });
});
