-- P0: fecha o gap deixado pela migration anterior (20260924220000).
--
-- `REVOKE EXECUTE ... FROM anon, authenticated` não bastou: o Postgres
-- concede EXECUTE a PUBLIC automaticamente na criação da função, e
-- has_function_privilege('anon', ...) considera o grant efetivo, que
-- inclui PUBLIC. Confirmado em produção: apos a migration anterior,
-- mcp_query_sql_revoked ainda retornava false. Revoga também de PUBLIC
-- nas 8 funções do grupo REVOKE.

REVOKE EXECUTE ON FUNCTION public.mcp_query_sql(text, integer, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.anonimizar_dados_pessoais(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_ciencia_rate_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reconciliar_ferias_folha_batch() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sec_verify_seals() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calcular_prazo_cat() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validar_contrato_clt() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_ponto_compliance() FROM PUBLIC;
