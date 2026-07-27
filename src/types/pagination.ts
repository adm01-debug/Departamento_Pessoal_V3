/**
 * Tipos compartilhados para pagination
 * P1-020: Keyset pagination
 */

export interface CursorInfo {
  column: string;
  value: unknown;
  direction: 'after' | 'before';
}

export interface FeriasRow {
  id: string;
  colaborador_id: string;
  empresa_id: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  created_at: string;
  /** nem toda projeção inclui updated_at */
  updated_at?: string;
}

export interface ColaboradorRow {
  id: string;
  nome_completo: string;
  cpf: string;
  cargo: string | null;
  departamento: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Codifica o valor de um cursor (keyset) em string segura para URL.
 * Usamos base64url para evitar problemas com caracteres especiais em datas/UUIDs.
 */
export function encodeCursor(value: unknown): string {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  try {
    return btoa(unescape(encodeURIComponent(raw)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    // Ambiente sem btoa (SSR/worker): devolve o valor cru — ainda funcional.
    return raw;
  }
}

/**
 * Decodifica um cursor gerado por `encodeCursor`.
 * Retorna `null` quando o cursor é inválido (nunca lança).
 */
export function decodeCursor(cursor: string | null | undefined): string | null {
  if (!cursor) return null;
  try {
    const padded = cursor.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    return null;
  }
}

/**
 * Extrai o cursor da última linha de uma página.
 * Retorna `null` quando a página está vazia ou a coluna não existe.
 */
export function extractNextCursor<T extends Record<string, unknown>>(
  rows: T[] | null | undefined,
  column: keyof T & string,
): string | null {
  if (!rows || rows.length === 0) return null;
  const last = rows[rows.length - 1];
  const value = last?.[column];
  if (value === undefined || value === null) return null;
  return encodeCursor(value);
}
