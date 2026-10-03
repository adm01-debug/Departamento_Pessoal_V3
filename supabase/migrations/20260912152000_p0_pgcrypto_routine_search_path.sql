-- P0: functions below call pgcrypto helpers through unqualified names.
-- pgcrypto lives in schema extensions in the canonical project, so these calls
-- fail at runtime unless that schema is part of the function-local path.
--
-- Reutiliza public.dp_mig_set_search_path (definida em 20260912150000).

DO $migration$
DECLARE
  routine_signature text;
  routines text[] := ARRAY[
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
  IF to_regprocedure('public.dp_mig_set_search_path(text,boolean,boolean)') IS NULL THEN
    RAISE EXCEPTION 'requires routine public.dp_mig_set_search_path (aplique 20260912150000 antes)';
  END IF;

  FOREACH routine_signature IN ARRAY routines LOOP
    PERFORM public.dp_mig_set_search_path(routine_signature, false, true);
  END LOOP;
END
$migration$;
