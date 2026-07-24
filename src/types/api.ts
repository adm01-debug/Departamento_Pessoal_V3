// Tipos genéricos para chamadas de API

/** Resposta padronizada de sucesso */
export interface ApiResponse<T> {
  data: T;
  success: true;
  durationMs?: number;
  count?: number;
}

/** Resposta padronizada de erro */
export interface ApiError {
  success: false;
  message: string;
  code?: string;
  details?: unknown;
  status?: number;
}

/** Resposta paginada padrão */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Tipo union para resultado de operação */
export type ApiResult<T> = ApiResponse<T> | ApiError;

/** Helper para construir resposta de sucesso */
export function ok<T>(data: T, extra?: Partial<ApiResponse<T>>): ApiResponse<T> {
  return { data, success: true, ...extra };
}

/** Helper para construir resposta de erro */
export function fail(
  message: string,
  code?: string,
  status?: number,
  details?: unknown,
): ApiError {
  return { success: false, message, code, status, details };
}

/** Helper para construir resposta paginada */
export function paginated<T>(
  data: T[],
  total: number,
  page = 1,
  pageSize = 10,
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}