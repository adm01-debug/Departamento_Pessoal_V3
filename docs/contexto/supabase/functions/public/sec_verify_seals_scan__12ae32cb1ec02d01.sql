CREATE OR REPLACE FUNCTION public.sec_verify_seals_scan()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  divergent_count bigint;
  details text;
BEGIN
  SELECT COALESCE(sum(v.divergentes), 0),
    COALESCE(string_agg(v.tabela || ' (' || v.divergentes || ')', ', ')
      FILTER (WHERE v.divergentes > 0), '')
  INTO divergent_count, details
  FROM public.sec_verify_seals() v;

  IF divergent_count > 0 THEN
    INSERT INTO public.historico_alertas (tipo, nivel, valor, limite, mensagem)
    VALUES (
      'integridade_selos', 'critico', divergent_count, 0,
      'Integrity seal divergence detected: ' || details
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'divergentes', divergent_count, 'detalhe', details
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.historico_alertas (tipo, nivel, valor, limite, mensagem)
  VALUES (
    'integridade_selos', 'critico', 1, 0,
    'Integrity seal scan failed: ' || left(SQLERRM, 500)
  );
  RETURN jsonb_build_object('ok', false, 'erro', 'seal scan failed');
END
$function$
