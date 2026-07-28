/**
 * Testes para Cursor Pagination Utilities
 * P1-020: Keyset pagination para tabelas >100K registros
 */

import { describe, it, expect } from 'vitest';
import {
  encodeCursor,
  parseCursor,
  buildCursorQuery,
  extractNextCursor,
  useCursorPagination,
} from './cursor';

describe('encodeCursor', () => {
  it('encode/decodes string values correctly', () => {
    const cursor = encodeCursor('id', '123', 'after');
    expect(cursor).toBe(btoa('id:123:after'));
  });

  it('encode/decodes numeric values correctly', () => {
    const cursor = encodeCursor('created_at', 1719475200000, 'after');
    expect(cursor).toBe(btoa('created_at:1719475200000:after'));
  });

  it('encode/decodes null values correctly', () => {
    const cursor = encodeCursor('deleted_at', null, 'before');
    expect(cursor).toBe(btoa('deleted_at:null:before'));
  });
});

describe('parseCursor', () => {
  it('parses valid cursor with string value', () => {
    const encoded = encodeCursor('id', 'abc-123', 'after');
    const result = parseCursor(encoded);
    expect(result).toEqual({ column: 'id', value: 'abc-123', direction: 'after' });
  });

  it('parses valid cursor with numeric value', () => {
    const encoded = encodeCursor('id', 12345, 'after');
    const result = parseCursor(encoded);
    expect(result).toEqual({ column: 'id', value: 12345, direction: 'after' });
  });

  it('parses valid cursor with null value', () => {
    const encoded = encodeCursor('deleted_at', null, 'before');
    const result = parseCursor(encoded);
    expect(result).toEqual({ column: 'deleted_at', value: null, direction: 'before' });
  });

  it('parses valid cursor with boolean true', () => {
    const encoded = encodeCursor('ativo', true, 'after');
    const result = parseCursor(encoded);
    expect(result).toEqual({ column: 'ativo', value: true, direction: 'after' });
  });

  it('parses valid cursor with boolean false', () => {
    const encoded = encodeCursor('ativo', false, 'after');
    const result = parseCursor(encoded);
    expect(result).toEqual({ column: 'ativo', value: false, direction: 'after' });
  });

  it('returns null for invalid base64', () => {
    const result = parseCursor('not-valid-base64!!!');
    expect(result).toBeNull();
  });

  it('returns null for malformed cursor (wrong number of parts)', () => {
    const result = parseCursor(btoa('only-one-part'));
    expect(result).toBeNull();
  });

  it('returns null for invalid column name (SQL injection attempt)', () => {
    // Tentativa de SQL injection via column name
    const result = parseCursor(btoa('id; DROP TABLE users;--:123:after'));
    expect(result).toBeNull();
  });

  it('returns null for invalid direction', () => {
    const result = parseCursor(btoa('id:123:invalid'));
    expect(result).toBeNull();
  });

  it('returns null for empty cursor', () => {
    const result = parseCursor('');
    expect(result).toBeNull();
  });
});

describe('buildCursorQuery', () => {
  it('builds query with gt operator for after direction', () => {
    const cursor = encodeCursor('id', 123, 'after');
    const query = buildCursorQuery(cursor, 20);
    expect(query).toBe('?id=gt.123&limit=20&order=id.asc');
  });

  it('builds query with lt operator for before direction', () => {
    const cursor = encodeCursor('id', 123, 'before');
    const query = buildCursorQuery(cursor, 20);
    expect(query).toBe('?id=lt.123&limit=20&order=id.desc');
  });

  it('uses default limit of 20 when not specified', () => {
    const cursor = encodeCursor('created_at', '2024-01-01', 'after');
    const query = buildCursorQuery(cursor);
    expect(query).toContain('limit=20');
  });

  it('uses custom limit when specified', () => {
    const cursor = encodeCursor('id', 123, 'after');
    const query = buildCursorQuery(cursor, 50);
    expect(query).toBe('?id=gt.123&limit=50&order=id.asc');
  });

  it('returns basic query for invalid cursor', () => {
    const query = buildCursorQuery('invalid-cursor', 20);
    expect(query).toBe('?limit=20');
  });

  it('handles null value correctly', () => {
    const cursor = encodeCursor('deleted_at', null, 'after');
    const query = buildCursorQuery(cursor, 20);
    expect(query).toContain('deleted_at=gt.null');
  });
});

describe('extractNextCursor', () => {
  it('extracts cursor from array with id field', () => {
    const data = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ];
    const cursor = extractNextCursor(data, 'id');
    expect(cursor).toBe(encodeCursor('id', '3', 'after'));
  });

  it('extracts cursor from array with created_at field', () => {
    const data = [
      { id: '1', created_at: '2024-01-01' },
      { id: '2', created_at: '2024-01-02' },
    ];
    const cursor = extractNextCursor(data, 'created_at');
    expect(cursor).toBe(encodeCursor('created_at', '2024-01-02', 'after'));
  });

  it('returns null for empty array', () => {
    const cursor = extractNextCursor([], 'id');
    expect(cursor).toBeNull();
  });

  it('returns null when column does not exist', () => {
    const data = [{ id: '1', name: 'Item 1' }];
    const cursor = extractNextCursor(data, 'nonexistent');
    expect(cursor).toBeNull();
  });

  it('handles numeric id values', () => {
    const data = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ];
    const cursor = extractNextCursor(data, 'id');
    expect(cursor).toBe(encodeCursor('id', 2, 'after'));
  });
});

describe('useCursorPagination', () => {
  it('returns hasMore true when data exists', () => {
    const data = [{ id: '1' }, { id: '2' }];
    const { nextCursor, hasMore } = useCursorPagination(data, 'id');
    expect(nextCursor).toBeTruthy();
    expect(hasMore).toBe(true);
  });

  it('returns hasMore false for empty data', () => {
    const data: Record<string, unknown>[] = [];
    const { nextCursor, hasMore } = useCursorPagination(data, 'id');
    expect(nextCursor).toBeNull();
    expect(hasMore).toBe(false);
  });
});
