-- P0: fecha o gap deixado pela migration anterior (20260924220000).
--
-- `REVOKE EXECUTE ... FROM anon, authenticated` não bastou: o Postgres
-- concede EXECUTE a PUBLIC automaticamente na criação da função, e
-- has_function_privilege('anon', ...) considera o grant efetivo, que
-- inclui PUBLIC. Confirmado em produção: apos a migration anterior,
-- mcp_query_sql_revoked ainda retornava false. Revoga também de PUBLIC
-- nas 8 funções do grupo REVOKE.
DO $guard$
BEGIN
  IF to_regprocedure('public.mcp_query_sql(text,integer,boolean)') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.mcp_query_sql(text, integer, boolean) FROM PUBLIC;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.anonimizar_dados_pessoais(uuid)') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.anonimizar_dados_pessoais(uuid) FROM PUBLIC;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.cleanup_ciencia_rate_limits()') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.cleanup_ciencia_rate_limits() FROM PUBLIC;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.reconciliar_ferias_folha_batch()') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.reconciliar_ferias_folha_batch() FROM PUBLIC;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.sec_verify_seals()') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.sec_verify_seals() FROM PUBLIC;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.calcular_prazo_cat()') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.calcular_prazo_cat() FROM PUBLIC;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.validar_contrato_clt()') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.validar_contrato_clt() FROM PUBLIC;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.validate_ponto_compliance()') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.validate_ponto_compliance() FROM PUBLIC;$sql$;
  END IF;
END $guard$;
