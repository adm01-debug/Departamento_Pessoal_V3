-- =============================================================================
-- CONCORRÊNCIA REAL DO RATE LIMIT DUPLO — empresa + usuário
-- =============================================================================
-- Parâmetros (psql -v): empresa, empresa_limite, usuario, usuario_limite,
--                        now, sleep
-- Saída: true/false (allowed)
-- =============================================================================
\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

BEGIN;
SELECT (public.edge_rate_limit_check_dual(
  :'empresa', :empresa_limite, :'usuario', :usuario_limite, 3600, :now
)) ->> 'allowed';
SELECT pg_sleep(:sleep);
COMMIT;
