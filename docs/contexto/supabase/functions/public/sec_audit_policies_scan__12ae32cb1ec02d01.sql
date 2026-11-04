CREATE OR REPLACE FUNCTION public.sec_audit_policies_scan()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  scan_timestamp timestamptz := clock_timestamp();
  finding_count integer;
BEGIN
  INSERT INTO public.sec_policy_regressions (
    scan_at, tabela, policy_name, cmd, motivo
  )
  SELECT scan_timestamp, p.tablename::text, p.policyname::text, p.cmd::text,
    CASE
      WHEN COALESCE(p.qual, '') ~* '^\s*true\s*$' THEN 'USING (true) - unrestricted'
      WHEN (COALESCE(p.qual, '') || COALESCE(p.with_check, ''))
        ~* 'auth\.role\(\)\s*=\s*''authenticated'''
        THEN 'authenticated role without tenant correlation'
      WHEN COALESCE(p.qual, '') || COALESCE(p.with_check, '') = ''
        THEN 'policy has no predicate'
      ELSE 'uncorrelated identifier subquery'
    END
  FROM pg_catalog.pg_policies p
  WHERE p.schemaname = 'public'
    AND (
      COALESCE(p.qual, '') ~* '^\s*true\s*$'
      OR (COALESCE(p.qual, '') || COALESCE(p.with_check, ''))
        ~* 'auth\.role\(\)\s*=\s*''authenticated'''
      OR COALESCE(p.qual, '') || COALESCE(p.with_check, '') = ''
      OR (
        (COALESCE(p.qual, '') || COALESCE(p.with_check, ''))
          ~* 'IN \( SELECT [a-z_]+\.(id|empresa_id)[^)]*FROM'
        AND (COALESCE(p.qual, '') || COALESCE(p.with_check, '')) !~* 'WHERE'
      )
    );
  GET DIAGNOSTICS finding_count = ROW_COUNT;

  IF finding_count > 0 THEN
    INSERT INTO public.historico_alertas (tipo, nivel, valor, limite, mensagem)
    VALUES (
      'seguranca_rls',
      CASE WHEN finding_count >= 5 THEN 'critico' ELSE 'atencao' END,
      finding_count,
      0,
      format('%s potentially unsafe RLS policies detected; inspect sec_policy_regressions.', finding_count)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'achados', finding_count, 'scan_at', scan_timestamp
  );
END
$function$
