import { describe, it, expect } from 'vitest';
import { isAllowedUrl, assertAllowedUrl, safeHref } from '../safeUrl';

describe('isAllowedUrl', () => {
  it('allows known supabase host', () => {
    expect(isAllowedUrl('https://ciziytrrjjotlsjzshnm.supabase.co/rest/v1/')).toBe(true);
  });

  it('allows lovable.app subdomain', () => {
    expect(isAllowedUrl('https://myapp.lovable.app/path')).toBe(true);
  });

  it('allows viacep.com.br', () => {
    expect(isAllowedUrl('https://viacep.com.br/ws/01310100/json/')).toBe(true);
  });

  it('blocks http URLs', () => {
    expect(isAllowedUrl('http://viacep.com.br/ws/01310100/json/')).toBe(false);
  });

  it('blocks unknown hosts', () => {
    expect(isAllowedUrl('https://evil.example.com/data')).toBe(false);
  });

  it('returns false for malformed URLs', () => {
    expect(isAllowedUrl('not-a-url')).toBe(false);
  });

  it('allows sentry.io subdomains', () => {
    expect(isAllowedUrl('https://o123.ingest.sentry.io/api/')).toBe(true);
  });
});

describe('assertAllowedUrl', () => {
  it('does not throw for allowed URL', () => {
    expect(() => assertAllowedUrl('https://viacep.com.br/ws/01310100/json/')).not.toThrow();
  });

  it('throws for disallowed URL', () => {
    expect(() => assertAllowedUrl('https://malicious.example.com')).toThrow('URL bloqueada');
  });
});

describe('safeHref', () => {
  it('returns # for empty string', () => {
    expect(safeHref('')).toBe('#');
  });

  it('returns # for null/undefined', () => {
    expect(safeHref(null)).toBe('#');
    expect(safeHref(undefined)).toBe('#');
  });

  it('allows relative paths starting with /', () => {
    expect(safeHref('/dashboard')).toBe('/dashboard');
  });

  it('allows anchor links', () => {
    expect(safeHref('#section')).toBe('#section');
  });

  it('allows https URLs', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com');
  });

  it('allows mailto links', () => {
    expect(safeHref('mailto:test@example.com')).toBe('mailto:test@example.com');
  });

  it('blocks javascript: protocol', () => {
    expect(safeHref('javascript:alert(1)')).toBe('#');
  });

  it('blocks data: URIs', () => {
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBe('#');
  });

  it('returns # for invalid URLs', () => {
    expect(safeHref('not a valid url at all')).toBe('#');
  });
});
