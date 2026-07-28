// Cursor-based pagination helpers (consumidor do P1-020 parseCursor).
// Tabelas com >100K linhas degradam severamente com OFFSET — keyset pagination
// (WHERE id > last_id ORDER BY id LIMIT N) mantém performance constante.
//
// Estes helpers são re-exportados para que hooks de listagem possam converter
// page/pageSize em cursor antes de chamar a bridge. O cursor é opaco
// (base64-encoded "column:value"), evitando que o cliente manipule filtros.

function toBase64(s: string): string {
  // Implementação compatível browser + Deno (Uint8Array -> btoa Latin-1 bridge)
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=+$/, '');
}

function fromBase64(s: string): string | null {
  try {
    const padded = s + '='.repeat((4 - (s.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Codifica um par (column, value) em um cursor opaco (base64).
 * Reaproveita a forma "<column>:<value>" que o parseCursor do bridge aceita.
 */
export function encodeCursor(column: string, value: string | number): string {
  return toBase64(`${column}:${value}`);
}

/**
 * Decodifica um cursor opaco de volta para o par (column, value).
 * Retorna null em caso de cursor malformado — o caller deve descartar
 * silenciosamente e voltar para a primeira página.
 */
export function decodeCursor(cursor: string): { column: string; value: string | number } | null {
  if (typeof cursor !== 'string' || cursor.length === 0 || cursor.length > 200) return null;
  const decoded = fromBase64(cursor);
  if (!decoded) return null;
  const idx = decoded.indexOf(':');
  if (idx < 1) return null;
  const column = decoded.substring(0, idx);
  const raw = decoded.substring(idx + 1);
  // Rejeita caracteres perigosos: mesmas regras de identificador do bridge.
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) return null;
  if (raw.length === 0 || raw.length > 128 || !/^[A-Za-z0-9_.:@-]*$/.test(raw)) return null;
  const asNumber = Number(raw);
  return { column, value: Number.isFinite(asNumber) && raw !== '' ? asNumber : raw };
}

/**
 * Converte cursor opaco + pageSize em um range PostgREST equivalente.
 * Útil como adapter em código que já consome range(0, N) — basta
 * traduzir cursor para o par (column, op, value).
 */
export interface CursorFilter {
  column: string;
  op: 'gt' | 'lt';
  value: string | number;
}

export function cursorToFilter(cursor: string | null, direction: 'forward' | 'backward' = 'forward'): CursorFilter | null {
  if (!cursor) return null;
  const decoded = decodeCursor(cursor);
  if (!decoded) return null;
  return {
    column: decoded.column,
    op: direction === 'forward' ? 'gt' : 'lt',
    value: decoded.value,
  };
}
