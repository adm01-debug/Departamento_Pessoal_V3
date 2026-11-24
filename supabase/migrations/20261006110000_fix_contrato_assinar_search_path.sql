-- =============================================================================
-- FIX search_path da RPC contrato_assinar_por_token (gate audit-db-search-path)
--
-- A versão vigente (20261006100000) fixa `SET search_path = pg_catalog, public,
-- pg_temp`, mas o corpo chama sha256()/digest() do pgcrypto — extensão que vive
-- no schema `extensions` no Supabase self-hosted. Sem `extensions` no
-- search_path a RPC quebra em runtime com "function sha256(text) does not exist".
-- Postgres não acusa isso no CREATE: corpo PL/pgSQL só resolve na execução.
-- =============================================================================

ALTER FUNCTION public.contrato_assinar_por_token(text, text, text, inet, text)
  SET search_path = pg_catalog, public, extensions, pg_temp;
