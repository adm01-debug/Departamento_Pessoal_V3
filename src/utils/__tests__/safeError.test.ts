import { describe, it, expect } from 'vitest';
import { safeErrorMessage } from '../safeError';

describe('safeErrorMessage', () => {
  it('returns fallback for null/undefined error', () => {
    expect(safeErrorMessage(null)).toBe('Ocorreu um erro. Tente novamente.');
    expect(safeErrorMessage(undefined)).toBe('Ocorreu um erro. Tente novamente.');
  });

  it('returns custom fallback when specified', () => {
    expect(safeErrorMessage(null, 'Custom error')).toBe('Custom error');
  });

  it('returns user-friendly message for duplicate key error', () => {
    const err = new Error('duplicate key value violates unique constraint "colaboradores_pkey"');
    expect(safeErrorMessage(err)).toBe('Este registro já existe no sistema.');
  });

  it('returns user-friendly message for permission denied error', () => {
    const err = new Error('permission denied for table colaboradores');
    expect(safeErrorMessage(err)).toBe('Você não tem permissão para esta operação.');
  });

  it('returns user-friendly message for RLS violation', () => {
    const err = new Error('new row violates row-level security policy for table "ferias"');
    expect(safeErrorMessage(err)).toBe('Acesso negado pela política de segurança.');
  });

  it('returns fallback for internal PostgreSQL error patterns', () => {
    const err = new Error('relation "internal_table" does not exist');
    expect(safeErrorMessage(err, 'DB error')).toBe('DB error');
  });

  it('returns fallback for messages mentioning supabase', () => {
    const err = new Error('supabase connection timeout');
    expect(safeErrorMessage(err, 'fallback')).toBe('fallback');
  });

  it('truncates messages longer than 200 chars', () => {
    const longMsg = 'a'.repeat(250);
    const result = safeErrorMessage(new Error(longMsg));
    expect(result.length).toBeLessThanOrEqual(201);
    expect(result.endsWith('…')).toBe(true);
  });

  it('returns the message as-is for short safe messages', () => {
    const err = new Error('Colaborador não encontrado');
    expect(safeErrorMessage(err)).toBe('Colaborador não encontrado');
  });

  it('handles non-Error objects via String()', () => {
    expect(safeErrorMessage('simple string error', 'fallback')).toBe('simple string error');
  });
});
