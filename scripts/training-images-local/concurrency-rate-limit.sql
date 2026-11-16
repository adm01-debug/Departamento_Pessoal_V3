-- =============================================================================
-- CONCORRÊNCIA REAL DO RATE LIMIT — advisory lock por chave
-- =============================================================================
-- Parâmetros (psql -v): key, limite, now, sleep
-- Saída: true/false (allowed)
-- =============================================================================
\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

BEGIN;
SELECT (public.edge_rate_limit_check(:'key', :limite, 3600, :now)) ->> 'allowed';
SELECT pg_sleep(:sleep);
COMMIT;
