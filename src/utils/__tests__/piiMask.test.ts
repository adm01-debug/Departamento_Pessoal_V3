import { describe, it, expect } from 'vitest';
import { maskCpfDisplay, maskBankAccount, maskPisDisplay, maskEmail } from '../piiMask';

describe('maskCpfDisplay', () => {
  it('returns empty string for null', () => {
    expect(maskCpfDisplay(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(maskCpfDisplay(undefined)).toBe('');
  });

  it('masks 11-digit CPF showing only last 2 digits', () => {
    const result = maskCpfDisplay('123.456.789-09');
    expect(result).toContain('09');
    expect(result).toMatch(/^•{3}\.•{3}\.•{3}-\d{2}$/);
  });

  it('returns masked placeholder for invalid CPF length', () => {
    const result = maskCpfDisplay('12345');
    expect(result).toMatch(/^•+$/);
  });
});

describe('maskBankAccount', () => {
  it('returns empty string for null', () => {
    expect(maskBankAccount(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(maskBankAccount(undefined)).toBe('');
  });

  it('masks all but last 4 digits of account', () => {
    const result = maskBankAccount('12345678');
    expect(result).toBe('••••5678');
  });

  it('masks short account with fewer than 4 digits fully', () => {
    const result = maskBankAccount('123');
    expect(result).toMatch(/^•{3}$/);
  });
});

describe('maskPisDisplay', () => {
  it('returns empty string for null', () => {
    expect(maskPisDisplay(null)).toBe('');
  });

  it('masks 11-digit PIS showing only last digit', () => {
    const result = maskPisDisplay('12345678901');
    expect(result).toContain('1');
    expect(result).toMatch(/^•{3}\.•{5}\.•{2}-\d{1}$/);
  });

  it('returns masked placeholder for wrong length', () => {
    const result = maskPisDisplay('12345');
    expect(result).toMatch(/^•+$/);
  });
});

describe('maskEmail', () => {
  it('returns empty string for null', () => {
    expect(maskEmail(null)).toBe('');
  });

  it('masks local part keeping first and last char', () => {
    const result = maskEmail('john.doe@example.com');
    expect(result).toContain('@example.com');
    expect(result.startsWith('j')).toBe(true);
    expect(result).toContain('e@');
  });

  it('masks entire local part when very short', () => {
    const result = maskEmail('ab@example.com');
    expect(result).toContain('@example.com');
  });

  it('masks without domain entirely for invalid email', () => {
    const result = maskEmail('notanemail');
    expect(result).toMatch(/^•+$/);
  });
});
