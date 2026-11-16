-- =============================================================================
-- CONCORRÊNCIA REAL DA FILA AUTOMÁTICA — FOR UPDATE SKIP LOCKED
-- =============================================================================
-- Parâmetros (psql -v): limite, sleep
-- Saída: id reivindicado (vazio quando nada é pego)
-- =============================================================================
\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

BEGIN;
SELECT id FROM public.claim_training_image_requests(:limite);
SELECT pg_sleep(:sleep);
COMMIT;
