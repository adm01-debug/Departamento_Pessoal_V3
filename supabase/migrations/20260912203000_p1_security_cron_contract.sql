-- P1: restore the three security cron targets that exist in the canonical
-- scheduler but currently fail because their functions/tables are absent.

DO $preflight$
BEGIN
  IF to_regclass('public.historico_alertas') IS NULL
     OR to_regclass('cron.job') IS NULL THEN
    RAISE EXCEPTION 'P1 security cron contract requires historico_alertas and pg_cron';
  END IF;
  IF to_regprocedure('public.sec_audit_policies()') IS NULL
     OR to_regprocedure('public.sec_verify_seals()') IS NULL
     OR to_regprocedure('public.is_admin(uuid)') IS NULL THEN
    RAISE EXCEPTION 'P1 security cron contract requires the core policy/seal auditors and is_admin';
  END IF;
END
$preflight$;

CREATE TABLE IF NOT EXISTS public.sec_policy_regressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_at timestamptz NOT NULL DEFAULT now(),
  tabela text NOT NULL,
  policy_name text NOT NULL,
  cmd text,
  motivo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sec_policy_regressions_scan_at
  ON public.sec_policy_regressions (scan_at DESC);

CREATE TABLE IF NOT EXISTS public.sec_seal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid,
  evento text NOT NULL CHECK (evento IN ('selado', 'desselado')),
  detalhe text,
  ator uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sec_seal_events_tabela_data
  ON public.sec_seal_events (tabela, created_at DESC);

ALTER TABLE public.sec_policy_regressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sec_seal_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sec_policy_regressions, public.sec_seal_events FROM PUBLIC, anon;
GRANT SELECT ON public.sec_policy_regressions, public.sec_seal_events TO authenticated;
GRANT ALL ON public.sec_policy_regressions, public.sec_seal_events TO service_role;

DROP POLICY IF EXISTS sec_policy_regressions_admin_read ON public.sec_policy_regressions;
CREATE POLICY sec_policy_regressions_admin_read
  ON public.sec_policy_regressions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS sec_seal_events_admin_read ON public.sec_seal_events;
CREATE POLICY sec_seal_events_admin_read
  ON public.sec_seal_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.sec_audit_policies_scan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  scan_timestamp timestamptz := clock_timestamp();
  finding_count integer;
BEGIN
  -- Do not call sec_audit_policies() here: that user-facing function requires
  -- an authenticated admin and auth.uid() is intentionally NULL in pg_cron.
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
$function$;

CREATE OR REPLACE FUNCTION public.sec_policy_regressions_purge()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.sec_policy_regressions
  WHERE scan_at < now() - interval '180 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END
$function$;

CREATE OR REPLACE FUNCTION public.sec_verify_seals_scan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
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
$function$;

REVOKE ALL ON FUNCTION public.sec_audit_policies_scan() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sec_policy_regressions_purge() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sec_verify_seals_scan() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sec_audit_policies_scan(),
  public.sec_policy_regressions_purge(), public.sec_verify_seals_scan()
  TO service_role;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'sec-audit-policies-daily',
  'sec-policy-regressions-purge',
  'sec-verify-seals-weekly'
);

SELECT cron.schedule(
  'sec-audit-policies-daily', '0 4 * * *',
  $cron$SELECT public.sec_audit_policies_scan();$cron$
);
SELECT cron.schedule(
  'sec-policy-regressions-purge', '30 4 * * 0',
  $cron$SELECT public.sec_policy_regressions_purge();$cron$
);
SELECT cron.schedule(
  'sec-verify-seals-weekly', '15 3 * * 1',
  $cron$SELECT public.sec_verify_seals_scan();$cron$
);

DO $postcheck$
DECLARE
  matching_jobs integer;
BEGIN
  SELECT count(*) INTO matching_jobs FROM cron.job
  WHERE (jobname, schedule, command) IN (
    ('sec-audit-policies-daily', '0 4 * * *', 'SELECT public.sec_audit_policies_scan();'),
    ('sec-policy-regressions-purge', '30 4 * * 0', 'SELECT public.sec_policy_regressions_purge();'),
    ('sec-verify-seals-weekly', '15 3 * * 1', 'SELECT public.sec_verify_seals_scan();')
  );
  IF matching_jobs <> 3 THEN
    RAISE EXCEPTION 'security cron postcheck failed (%/3 exact jobs)', matching_jobs;
  END IF;
END
$postcheck$;
