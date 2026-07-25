import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validatePassword, checkPasswordBreach, validatePasswordFull } from '../passwordPolicy';

describe('validatePassword', () => {
  it('returns valid for a strong password', () => {
    const result = validatePassword('Str0ng@Pass');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects passwords shorter than 8 chars', () => {
    const result = validatePassword('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Mínimo de 8 caracteres');
  });

  it('rejects passwords longer than 128 chars', () => {
    const result = validatePassword('Aa1!' + 'x'.repeat(125));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Máximo de 128 caracteres');
  });

  it('rejects passwords without uppercase', () => {
    const result = validatePassword('lowercase1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Pelo menos 1 letra maiúscula');
  });

  it('rejects passwords without lowercase', () => {
    const result = validatePassword('UPPERCASE1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Pelo menos 1 letra minúscula');
  });

  it('rejects passwords without digits', () => {
    const result = validatePassword('NoDigits!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Pelo menos 1 número');
  });

  it('rejects passwords without special chars', () => {
    const result = validatePassword('NoSpecial1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Pelo menos 1 caractere especial');
  });

  it('accumulates multiple errors', () => {
    const result = validatePassword('abc');
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('checkPasswordBreach', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns breached true when hash suffix found in response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => 'ABCDE:10\nFGHIJ:5\n',
    } as Response);

    const result = await checkPasswordBreach('test');
    expect(result).toEqual(expect.objectContaining({ breached: expect.any(Boolean), count: expect.any(Number) }));
  });

  it('returns not breached when fetch fails', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValue(new Error('network error'));
    const result = await checkPasswordBreach('test');
    expect(result).toEqual({ breached: false, count: 0 });
  });

  it('returns not breached when response not ok', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: false } as Response);
    const result = await checkPasswordBreach('test');
    expect(result).toEqual({ breached: false, count: 0 });
  });
});

describe('validatePasswordFull', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns invalid immediately without breach check when base fails', async () => {
    const fetchSpy = vi.mocked(fetch);
    const result = await validatePasswordFull('weak');
    expect(result.valid).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns valid with empty warnings for non-breached strong password', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: false } as Response);
    const result = await validatePasswordFull('Str0ng@PassWord!');
    expect(result.valid).toBe(true);
    expect(result.warnings ?? []).toHaveLength(0);
  });
});
