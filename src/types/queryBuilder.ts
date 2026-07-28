import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Resposta bruta do PostgREST antes de qualquer narrowing de domínio.
 *
 * Por que `unknown` e não um genérico: o `BaseService` opera sobre nomes de
 * tabela dinâmicos (string em runtime). Instanciar os tipos gerados do Supabase
 * para todas as tabelas em um builder genérico faz o parser de tipos do
 * supabase-js explodir o tempo de typecheck. Mantemos a resposta como `unknown`
 * e deixamos cada serviço concreto fazer o narrowing explícito.
 */
export interface LooseQueryResponse {
  data: unknown;
  count: number | null;
  error: PostgrestError | null;
  status: number;
  statusText: string;
}

type Filter = (column: string, value: unknown) => LooseQueryBuilder;

/**
 * Contrato estrutural mínimo do query builder do PostgREST usado pelo
 * `BaseService`. Substitui o antigo `(supabase as any).from(...)`, que
 * propagava `any` para 40+ serviços — qualquer erro de digitação em `.eq()`,
 * `.range()` ou no destructuring da resposta passava batido no compilador.
 */
export interface LooseQueryBuilder extends PromiseLike<LooseQueryResponse> {
  select(columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): LooseQueryBuilder;
  insert(values: unknown, options?: { count?: 'exact' }): LooseQueryBuilder;
  update(values: unknown, options?: { count?: 'exact' }): LooseQueryBuilder;
  upsert(values: unknown, options?: { onConflict?: string; count?: 'exact' }): LooseQueryBuilder;
  delete(options?: { count?: 'exact' }): LooseQueryBuilder;

  eq: Filter;
  neq: Filter;
  gt: Filter;
  gte: Filter;
  lt: Filter;
  lte: Filter;
  is: Filter;
  in(column: string, values: readonly unknown[]): LooseQueryBuilder;
  contains: Filter;
  ilike(column: string, pattern: string): LooseQueryBuilder;
  like(column: string, pattern: string): LooseQueryBuilder;
  or(filters: string, options?: { foreignTable?: string; referencedTable?: string }): LooseQueryBuilder;
  not(column: string, operator: string, value: unknown): LooseQueryBuilder;

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string }): LooseQueryBuilder;
  range(from: number, to: number): LooseQueryBuilder;
  limit(count: number, options?: { referencedTable?: string }): LooseQueryBuilder;

  single(): PromiseLike<LooseQueryResponse>;
  maybeSingle(): PromiseLike<LooseQueryResponse>;
}
