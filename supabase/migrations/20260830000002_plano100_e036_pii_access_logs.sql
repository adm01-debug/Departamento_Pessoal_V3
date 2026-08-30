-- ============================================================================
-- PLANO_100 · E-036 · [P1] · observabilidade/LGPD — trilha de acesso a PII
-- ----------------------------------------------------------------------------
-- Trilha dedicada de acesso a dados pessoais (LGPD art. 37 — registro das
-- operações de tratamento), view de acessos suspeitos e função de alerta por
-- limiar. Aditiva e idempotente.
-- ============================================================================

-- ── 1. Tabela de trilha ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pii_access_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid,                    -- auth.uid() de quem leu
  empresa_id     uuid,                    -- tenant dono do dado lido
  tabela         text NOT NULL,           -- ex.: 'holerites','colaboradores'
  acao           text NOT NULL DEFAULT 'select',  -- select|export|print|download
  registro_id    text,
  registro_count integer NOT NULL DEFAULT 1,
  ip             text,
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pii_access_logs_user_ts
  ON public.pii_access_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pii_access_logs_empresa_ts
  ON public.pii_access_logs (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pii_access_logs_tabela_ts
  ON public.pii_access_logs (tabela, created_at DESC);

COMMENT ON TABLE public.pii_access_logs IS
  'LGPD art. 37 — registro de leituras sobre dados pessoais. E-036 do PLANO_100.';

-- ── 2. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.pii_access_logs ENABLE ROW LEVEL SECURITY;

-- Leitura: admin global OU gestor/rh do tenant.
DROP POLICY IF EXISTS pii_access_logs_select_admin ON public.pii_access_logs;
CREATE POLICY pii_access_logs_select_admin ON public.pii_access_logs
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
    AND (
      public.has_role(auth.uid(), 'gestor'::public.app_role)
      OR public.has_role(auth.uid(), 'rh'::public.app_role)
    )
  )
);

-- Escrita: o próprio usuário autenticado registra o próprio acesso.
DROP POLICY IF EXISTS pii_access_logs_insert_own ON public.pii_access_logs;
CREATE POLICY pii_access_logs_insert_own ON public.pii_access_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Trilha imutável via API; purge só via função service_role.
REVOKE UPDATE, DELETE, TRUNCATE ON public.pii_access_logs FROM authenticated;
REVOKE ALL ON public.pii_access_logs FROM anon;

-- ── 3. View de acessos suspeitos (janela de 24h, limiares por hora) ────────
CREATE OR REPLACE VIEW public.v_pii_access_suspeitos
WITH (security_invoker = true) AS
SELECT
  user_id,
  empresa_id,
  tabela,
  acao,
  date_trunc('hour', created_at) AS janela,
  sum(registro_count)            AS total_registros,
  count(*)                       AS total_eventos,
  max(created_at)                AS ultimo_evento
FROM public.pii_access_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY user_id, empresa_id, tabela, acao, date_trunc('hour', created_at)
HAVING
  sum(registro_count) > 200
  OR (acao IN ('export', 'download') AND sum(registro_count) > 50);

COMMENT ON VIEW public.v_pii_access_suspeitos IS
  'E-036: acessos a PII acima do limiar (200 leituras/h ou 50 exports/h).';

REVOKE ALL ON public.v_pii_access_suspeitos FROM anon;

-- ── 4. Função de alerta (job pg_cron / admin UI) ───────────────────────────
-- Conta janelas suspeitas recentes e grava evento em audit_log_unified
-- (dedup por usuário+tabela+janela em 2h para não inundar a trilha).
CREATE OR REPLACE FUNCTION public.fn_alert_pii_access_anomaly(p_horas integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_suspeitos integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT user_id, empresa_id, tabela, janela, total_registros
    FROM public.v_pii_access_suspeitos
    WHERE janela > now() - make_interval(hours => GREATEST(p_horas, 1))
  LOOP
    v_suspeitos := v_suspeitos + 1;
    INSERT INTO public.audit_log_unified
      (source_table, entity, entity_id, action, empresa_id, payload)
    SELECT
      'pii_access_logs', 'pii_access_anomaly',
      r.user_id::text, 'PII_ACCESS_ANOMALY', r.empresa_id,
      jsonb_build_object(
        'user_id', r.user_id, 'tabela', r.tabela,
        'janela', r.janela, 'total_registros', r.total_registros)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.audit_log_unified a
      WHERE a.action = 'PII_ACCESS_ANOMALY'
        AND a.entity_id = r.user_id::text
        AND a.payload->>'janela' = r.janela::text
        AND a.created_at > now() - interval '2 hours');
  END LOOP;
  RETURN v_suspeitos;
EXCEPTION
  WHEN undefined_table OR undefined_column THEN
    -- audit_log_unified ausente por drift: retorna contagem sem persistir.
    RETURN v_suspeitos;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_alert_pii_access_anomaly(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_alert_pii_access_anomaly(integer) FROM anon;
REVOKE ALL ON FUNCTION public.fn_alert_pii_access_anomaly(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_alert_pii_access_anomaly(integer) TO service_role;

-- ── 5. Retenção LGPD: purge da trilha com mais de N dias (default 180) ─────
CREATE OR REPLACE FUNCTION public.purge_pii_access_logs(p_dias integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_removed integer;
BEGIN
  DELETE FROM public.pii_access_logs
  WHERE created_at < now() - make_interval(days => GREATEST(p_dias, 30));
  GET DIAGNOSTICS v_removed = ROW_COUNT;
  RETURN v_removed;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_pii_access_logs(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_pii_access_logs(integer) FROM anon;
REVOKE ALL ON FUNCTION public.purge_pii_access_logs(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_pii_access_logs(integer) TO service_role;

-- Purge diário às 03:20 UTC (idempotente; ignora se pg_cron indisponível).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job
      WHERE jobname = 'purge-pii-access-logs-daily';
    PERFORM cron.schedule(
      'purge-pii-access-logs-daily',
      '20 3 * * *',
      $cmd$ SELECT public.purge_pii_access_logs(180); $cmd$);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── Verificação (preview) ──────────────────────────────────────────────────
-- SELECT to_regclass('public.pii_access_logs');                        -- not null
-- SELECT relrowsecurity FROM pg_class
--  WHERE oid = 'public.pii_access_logs'::regclass;                     -- true
-- SELECT has_table_privilege('anon','public.pii_access_logs','SELECT');-- false
-- SELECT prosecdef, proconfig FROM pg_proc WHERE proname IN
--   ('fn_alert_pii_access_anomaly','purge_pii_access_logs');
--   -- esperado: prosecdef=true e search_path fixado em ambas
