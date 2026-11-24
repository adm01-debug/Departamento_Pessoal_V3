-- Funções internas indevidamente expostas ao papel anônimo/público
REVOKE EXECUTE ON FUNCTION public.contrato_montar_variaveis(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.contrato_resolver_template(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.check_ciencia_rate_limit(text, text, integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_ciencia_rate_limits() FROM anon, public;

-- Funções de gatilho não devem ser chamáveis pela API
REVOKE EXECUTE ON FUNCTION public.fn_validar_medida_disciplinar_clt() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validar_contrato_clt() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_contrato_token_auditar() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_medida_aplicada_integrar() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_medida_contestacao_notify() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_medida_contestacao_notify_after() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trg_medida_esocial_on_aplicada() FROM anon, authenticated, public;