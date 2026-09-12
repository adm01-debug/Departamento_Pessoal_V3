-- P0: functions below call pgcrypto helpers through unqualified names.
-- pgcrypto lives in schema extensions in the canonical project, so these calls
-- fail at runtime unless that schema is part of the function-local path.
DO $migration$
DECLARE
  routine_signature text;
  routine_oid oid;
  routine_schema text;
  routine_name text;
  identity_arguments text;
  expected_routines constant text[] := ARRAY[
    'public.assinar_desligamento(uuid,text)',
    'public.assinar_espelho_ponto(uuid,text,inet,text)',
    'public.contrato_assinar_por_token(text,text,text,inet,text)',
    'public.contrato_consultar_por_token(text)',
    'public.contrato_gerar_token_assinatura(uuid,text,text,integer)',
    'public.contrato_preview_url_por_token(text)',
    'public.gerar_hash_batida_ponto()',
    'public.gerar_relatorio_conformidade_ponto()',
    'public.medida_gerar_link_ciencia(uuid)',
    'public.medida_registrar_ciencia_publica(text,text,text,text,text,jsonb)',
    'public.processar_ajuste_aprovado(uuid)',
    'public.sst_regimento_assinar(uuid,uuid,text,text)',
    'public.sst_regimento_publicar(uuid)',
    'public.verificar_espelho_ponto(uuid)'
  ];
BEGIN
  FOREACH routine_signature IN ARRAY expected_routines LOOP
    routine_oid := to_regprocedure(routine_signature);
    IF routine_oid IS NULL THEN
      RAISE EXCEPTION 'P0 pgcrypto search_path remediation requires routine %', routine_signature;
    END IF;
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
      INTO routine_schema, routine_name, identity_arguments
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.oid = routine_oid;
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = pg_catalog, public, extensions',
      routine_schema,
      routine_name,
      identity_arguments
    );
  END LOOP;
END
$migration$;
