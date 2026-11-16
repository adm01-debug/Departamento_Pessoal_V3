-- =============================================================================
-- CONCORRÊNCIA REAL — uma sessão do psql por worker
-- =============================================================================
-- Parâmetros (psql -v): empresa, tipo, content, hash, sleep
-- A sessão que segura a transação mantém o lock do ON CONFLICT até o COMMIT;
-- a concorrente bloqueia e, ao liberar, reavalia o WHERE da reivindicação.
-- Saída esperada (unaligned/tuples-only): reclamado|status|attempts
-- =============================================================================
\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

BEGIN;
SELECT reclamado, status, attempts
FROM public.claim_training_image(
  :'empresa'::uuid,
  :'tipo',
  :'content'::uuid,
  :'hash'
);
SELECT pg_sleep(:sleep);
COMMIT;
