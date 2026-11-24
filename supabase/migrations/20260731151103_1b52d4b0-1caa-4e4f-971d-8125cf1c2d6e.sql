-- Reduz a superfície de RPCs SECURITY DEFINER acessíveis a papéis públicos.
-- Critério: função sem uso no frontend e sem uso em políticas RLS.
-- Todas continuam acessíveis a service_role (edge functions / bridge).
DO $guard$
BEGIN
  IF to_regprocedure('public.medida_verificar_ciencia_hash(text)') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.medida_verificar_ciencia_hash(text) FROM anon, authenticated;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.sec_verify_seals_admin()') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.sec_verify_seals_admin() FROM anon, authenticated;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.revogar_espelho_ponto(uuid,text,inet,text)') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.revogar_espelho_ponto(uuid,text,inet,text) FROM anon, authenticated;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.gerar_canonical_espelho_ponto(uuid,text)') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.gerar_canonical_espelho_ponto(uuid,text) FROM anon, authenticated;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.contrato_token_evento_registrar(uuid,text,jsonb,inet,text)') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.contrato_token_evento_registrar(uuid,text,jsonb,inet,text) FROM anon, authenticated;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.contrato_verificar_autenticidade(text)') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.contrato_verificar_autenticidade(text) FROM anon, authenticated;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.contrato_montar_variaveis(uuid)') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.contrato_montar_variaveis(uuid) FROM anon, authenticated;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.contrato_resolver_template(uuid)') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.contrato_resolver_template(uuid) FROM anon, authenticated;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.medidas_analytics_reincidencia(uuid,date,date)') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.medidas_analytics_reincidencia(uuid,date,date) FROM anon, authenticated;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.enfileirar_esocial_medida_disciplinar(uuid)') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.enfileirar_esocial_medida_disciplinar(uuid) FROM anon, authenticated;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.get_user_default_empresa(uuid)') IS NOT NULL THEN
    EXECUTE $sql$REVOKE EXECUTE ON FUNCTION public.get_user_default_empresa(uuid) FROM anon, authenticated;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.medida_verificar_ciencia_hash(text)') IS NOT NULL THEN
    EXECUTE $sql$GRANT EXECUTE ON FUNCTION public.medida_verificar_ciencia_hash(text) TO service_role;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.sec_verify_seals_admin()') IS NOT NULL THEN
    EXECUTE $sql$GRANT EXECUTE ON FUNCTION public.sec_verify_seals_admin() TO service_role;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.revogar_espelho_ponto(uuid,text,inet,text)') IS NOT NULL THEN
    EXECUTE $sql$GRANT EXECUTE ON FUNCTION public.revogar_espelho_ponto(uuid,text,inet,text) TO service_role;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.gerar_canonical_espelho_ponto(uuid,text)') IS NOT NULL THEN
    EXECUTE $sql$GRANT EXECUTE ON FUNCTION public.gerar_canonical_espelho_ponto(uuid,text) TO service_role;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.contrato_token_evento_registrar(uuid,text,jsonb,inet,text)') IS NOT NULL THEN
    EXECUTE $sql$GRANT EXECUTE ON FUNCTION public.contrato_token_evento_registrar(uuid,text,jsonb,inet,text) TO service_role;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.contrato_verificar_autenticidade(text)') IS NOT NULL THEN
    EXECUTE $sql$GRANT EXECUTE ON FUNCTION public.contrato_verificar_autenticidade(text) TO service_role;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.contrato_montar_variaveis(uuid)') IS NOT NULL THEN
    EXECUTE $sql$GRANT EXECUTE ON FUNCTION public.contrato_montar_variaveis(uuid) TO service_role;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.contrato_resolver_template(uuid)') IS NOT NULL THEN
    EXECUTE $sql$GRANT EXECUTE ON FUNCTION public.contrato_resolver_template(uuid) TO service_role;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.medidas_analytics_reincidencia(uuid,date,date)') IS NOT NULL THEN
    EXECUTE $sql$GRANT EXECUTE ON FUNCTION public.medidas_analytics_reincidencia(uuid,date,date) TO service_role;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.enfileirar_esocial_medida_disciplinar(uuid)') IS NOT NULL THEN
    EXECUTE $sql$GRANT EXECUTE ON FUNCTION public.enfileirar_esocial_medida_disciplinar(uuid) TO service_role;$sql$;
  END IF;
END $guard$;
DO $guard$
BEGIN
  IF to_regprocedure('public.get_user_default_empresa(uuid)') IS NOT NULL THEN
    EXECUTE $sql$GRANT EXECUTE ON FUNCTION public.get_user_default_empresa(uuid) TO service_role;$sql$;
  END IF;
END $guard$;