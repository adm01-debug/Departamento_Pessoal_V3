/**
 * Cursor-based Pagination Utilities
 * Implementa keyset pagination para substituir offset-based pagination
 * P1-020: resolve degradação de performance em tabelas >100K registros
 */

export interface CursorParams {
  cursor?: string;
  limit?: number;
}

export interface CursorResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Codifica um cursor para URL-safe base64
 * Formato: base64(columnName:value:direction)
 */
export function encodeCursor(column: string, value: unknown, direction: 'after' | 'before' = 'after'): string {
  const raw = `${column}:${String(value)}:${direction}`;
  return btoa(raw);
}

/**
 * Decodifica um cursor de volta para seus componentes
 * Valida formato para prevenir injection
 */
export function parseCursor(cursor: string): { column: string; value: unknown; direction: 'after' | 'before' } | null {
  try {
    const decoded = atob(cursor);
    const parts = decoded.split(':');

    // Validação: deve ter exatamente 3 partes
    if (parts.length !== 3) return null;

    const [column, valueStr, direction] = parts;

    // Validação: column não pode ter caracteres especiais (SQL injection prevention)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) return null;

    // Validação: direction deve ser after ou before
    if (direction !== 'after' && direction !== 'before') return null;

    // Tentar parsear como número, boolean, ou manter como string
    let value: unknown = valueStr;
    if (valueStr === 'null') {
      value = null;
    } else if (valueStr === 'true') {
      value = true;
    } else if (valueStr === 'false') {
      value = false;
    } else if (/^-?\d+$/.test(valueStr)) {
      value = parseInt(valueStr, 10);
    } else if (/^-?\d*\.\d+$/.test(valueStr)) {
      value = parseFloat(valueStr);
    }

    return { column, value, direction: direction as 'after' | 'before' };
  } catch {
    return null;
  }
}

/**
 * Constrói query string com cursor para PostgREST
 * Usa o formato nativo: ?id=gt.123 (greater than)
 */
export function buildCursorQuery(cursor: string, limit: number = 20): string {
  const parsed = parseCursor(cursor);
  if (!parsed) {
    return `?limit=${limit}`;
  }

  const { column, value, direction } = parsed;
  const op = direction === 'after' ? 'gt' : 'lt';

  return `?${column}=${op}.${value}&limit=${limit}&order=${column}.${direction === 'after' ? 'asc' : 'desc'}`;
}

/**
 * Extrai próximo cursor do último item de uma lista
 * Usa o campo 'id' por padrão ou o campo especificado
 */
export function extractNextCursor<T extends Record<string, unknown>>(
  data: T[],
  column: string = 'id'
): string | null {
  if (!data || data.length === 0) return null;

  const lastItem = data[data.length - 1];
  const value = lastItem[column];

  if (value === undefined || value === null) return null;

  return encodeCursor(column, value, 'after');
}

/**
 * Hook helper para paginação com cursor
 * Substitui page * limit em queries grandes
 */
export function useCursorPagination<T extends Record<string, unknown>>(
  items: T[],
  column: string = 'id'
) {
  const nextCursor = extractNextCursor(items, column);

  return {
    nextCursor,
    hasMore: items.length > 0 && nextCursor !== null,
  };
}
