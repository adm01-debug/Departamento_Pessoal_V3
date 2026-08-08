-- ETAPA 1: remove o oráculo de enumeração sem rate-limit (v1 legada).
-- A UI publica (VerificarContratoPage) usa exclusivamente a v2, que aplica
-- rate limit por IP em ciencia_rate_limits.
REVOKE EXECUTE ON FUNCTION public.contrato_verificar_autenticidade(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_verificar_autenticidade(text) TO authenticated, service_role;
