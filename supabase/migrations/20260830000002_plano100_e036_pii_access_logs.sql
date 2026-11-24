-- PLANO_100 · E-036 · Trilha server-authoritative de acesso a PII.

CREATE TABLE IF NOT EXISTS public.pii_access_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  empresa_id     uuid NOT NULL,
  tabela         text NOT NULL,
  acao           text NOT NULL DEFAULT 'select',
  registro_id    text,
  registro_count integer NOT NULL DEFAULT 1,
  ip             text,
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pii_access_logs_tabela_valid CHECK (tabela ~ '^[a-z][a-z0-9_]{0,62}$'),
  CONSTRAINT pii_access_logs_acao_valid CHECK (acao IN ('select', 'export', 'print', 'download')),
  CONSTRAINT pii_access_logs_count_valid CHECK (registro_count BETWEEN 1 AND 100000),
  CONSTRAINT pii_access_logs_registro_id_size CHECK (registro_id IS NULL OR length(registro_id) <= 256),
  CONSTRAINT pii_access_logs_user_agent_size CHECK (user_agent IS NULL OR length(user_agent) <= 1024)
);

CREATE INDEX IF NOT EXISTS idx_pii_access_logs_user_ts
  ON public.pii_access_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pii_access_logs_empresa_ts
  ON public.pii_access_logs (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pii_access_logs_tabela_ts
  ON public.pii_access_logs (tabela, created_at DESC);

COMMENT ON TABLE public.pii_access_logs IS
  'LGPD art. 37 — registro imutável e server-authoritative de leituras de PII.';

ALTER TABLE public.pii_access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pii_access_logs_select_admin ON public.pii_access_logs;
DROP POLICY IF EXISTS pii_access_logs_insert_own ON public.pii_access_logs;

CREATE POLICY pii_access_logs_select_admin ON public.pii_access_logs
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.user_can_manage_tenant_storage(auth.uid(), pii_access_logs.empresa_id)
);

REVOKE ALL ON public.pii_access_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pii_access_logs TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.pii_access_logs TO service_role;

CREATE OR REPLACE FUNCTION public.record_pii_access(
  p_empresa_id uuid,
  p_tabela text,
  p_acao text DEFAULT 'select',
  p_registro_id text DEFAULT NULL,
  p_registro_count integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_headers jsonb := '{}'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_empresa_id IS NULL OR NOT public.user_belongs_to_empresa(v_uid, p_empresa_id) THEN
    RAISE EXCEPTION 'TENANT_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_tabela IS NULL OR p_tabela !~ '^[a-z][a-z0-9_]{0,62}$' THEN
    RAISE EXCEPTION 'INVALID_TABLE' USING ERRCODE = '22023';
  END IF;
  IF p_acao IS NULL OR p_acao NOT IN ('select', 'export', 'print', 'download') THEN
    RAISE EXCEPTION 'INVALID_ACTION' USING ERRCODE = '22023';
  END IF;
  IF p_registro_count IS NULL OR p_registro_count NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION 'INVALID_COUNT' USING ERRCODE = '22023';
  END IF;
  IF p_registro_id IS NOT NULL AND length(p_registro_id) > 256 THEN
    RAISE EXCEPTION 'INVALID_RECORD_ID' USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_headers := COALESCE(NULLIF(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  EXCEPTION WHEN invalid_text_representation THEN
    v_headers := '{}'::jsonb;
  END;

  INSERT INTO public.pii_access_logs (
    user_id, empresa_id, tabela, acao, registro_id, registro_count, ip, user_agent
  ) VALUES (
    v_uid, p_empresa_id, p_tabela, p_acao, p_registro_id, p_registro_count,
    left(split_part(COALESCE(v_headers->>'x-forwarded-for', ''), ',', 1), 64),
    left(COALESCE(v_headers->>'user-agent', ''), 1024)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_pii_access(uuid, text, text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_pii_access(uuid, text, text, text, integer)
  TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_pii_access_suspeitos
WITH (security_invoker = true) AS
SELECT
  user_id,
  empresa_id,
  tabela,
  acao,
  date_trunc('hour', created_at) AS janela,
  sum(registro_count) AS total_registros,
  count(*) AS total_eventos,
  max(created_at) AS ultimo_evento
FROM public.pii_access_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY user_id, empresa_id, tabela, acao, date_trunc('hour', created_at)
HAVING sum(registro_count) > 200
   OR (acao IN ('export', 'download') AND sum(registro_count) > 50);

REVOKE ALL ON public.v_pii_access_suspeitos FROM PUBLIC, anon;
GRANT SELECT ON public.v_pii_access_suspeitos TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.pii_access_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  tabela text NOT NULL,
  acao text NOT NULL,
  janela timestamptz NOT NULL,
  total_registros bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pii_access_alerts_dedup UNIQUE (user_id, empresa_id, tabela, acao, janela)
);
ALTER TABLE public.pii_access_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pii_access_alerts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.pii_access_alerts TO service_role;

CREATE OR REPLACE FUNCTION public.fn_alert_pii_access_anomaly(p_horas integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_inserted integer;
BEGIN
  INSERT INTO public.pii_access_alerts (
    user_id, empresa_id, tabela, acao, janela, total_registros
  )
  SELECT user_id, empresa_id, tabela, acao, janela, total_registros
  FROM public.v_pii_access_suspeitos
  WHERE janela > now() - make_interval(hours => GREATEST(p_horas, 1))
  ON CONFLICT (user_id, empresa_id, tabela, acao, janela) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_pii_access_logs(p_dias integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_removed integer;
BEGIN
  DELETE FROM public.pii_access_alerts
  WHERE janela < now() - make_interval(days => GREATEST(p_dias, 30));
  DELETE FROM public.pii_access_logs
  WHERE created_at < now() - make_interval(days => GREATEST(p_dias, 30));
  GET DIAGNOSTICS v_removed = ROW_COUNT;
  RETURN v_removed;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_alert_pii_access_anomaly(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_pii_access_logs(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_alert_pii_access_anomaly(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_pii_access_logs(integer) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job
      WHERE jobname = 'purge-pii-access-logs-daily';
    PERFORM cron.schedule(
      'purge-pii-access-logs-daily', '20 3 * * *',
      $cmd$ SELECT public.purge_pii_access_logs(180); $cmd$);
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR insufficient_privilege THEN
  RAISE NOTICE 'pg_cron indisponível; agendamento da retenção não criado';
END $$;
