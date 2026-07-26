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
  updated_at: string;
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
