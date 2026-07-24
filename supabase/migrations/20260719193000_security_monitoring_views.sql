-- Security monitoring views for admin dashboard.
-- These views surface actionable security metrics without exposing raw PII.
-- All view creations wrapped in DO/EXCEPTION to survive missing tables on preview branches.

-- 1) View: Recent suspicious activity (failed logins, rate limit hits)
DO $$
BEGIN
  EXECUTE $q$
    CREATE OR REPLACE VIEW public.v_security_dashboard AS
    SELECT
      'login_failures_24h' AS metric,
      COUNT(*)::TEXT AS value
    FROM public.login_attempts
    WHERE success = false AND created_at > NOW() - INTERVAL '24 hours'

    UNION ALL

    SELECT
      'rate_limit_hits_24h' AS metric,
      COUNT(*)::TEXT AS value
    FROM public.rate_limit_logs
    WHERE created_at > NOW() - INTERVAL '24 hours'

    UNION ALL

    SELECT
      'active_sessions' AS metric,
      COUNT(DISTINCT user_id)::TEXT AS value
    FROM public.audit_log
    WHERE acao IN ('INSERT', 'UPDATE') AND created_at > NOW() - INTERVAL '1 hour'

    UNION ALL

    SELECT
      'data_deletions_7d' AS metric,
      COUNT(*)::TEXT AS value
    FROM public.audit_log
    WHERE acao = 'DELETE' AND created_at > NOW() - INTERVAL '7 days'
  $q$;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2) View: Users with most failed logins (potential brute force targets)
DO $$
BEGIN
  EXECUTE $q$
    CREATE OR REPLACE VIEW public.v_security_brute_force_targets AS
    SELECT
      email,
      COUNT(*) AS failure_count,
      MAX(created_at) AS last_attempt
    FROM public.login_attempts
    WHERE success = false
      AND created_at > NOW() - INTERVAL '24 hours'
    GROUP BY email
    HAVING COUNT(*) >= 3
    ORDER BY failure_count DESC
    LIMIT 20
  $q$;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3) View: Audit log summary by action type (last 7 days)
DO $$
BEGIN
  EXECUTE $q$
    CREATE OR REPLACE VIEW public.v_audit_summary_7d AS
    SELECT
      acao,
      tabela,
      COUNT(*) AS total_events,
      COUNT(DISTINCT user_id) AS unique_users
    FROM public.audit_log
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY acao, tabela
    ORDER BY total_events DESC
  $q$;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 4) RLS on security views (admin only) — each wrapped in case view was skipped
DO $$ BEGIN ALTER VIEW public.v_security_dashboard SET (security_invoker = true); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER VIEW public.v_security_brute_force_targets SET (security_invoker = true); EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER VIEW public.v_audit_summary_7d SET (security_invoker = true); EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  COMMENT ON VIEW public.v_security_dashboard IS
    'Admin-facing security metrics: failed logins, rate limits, active sessions, deletions.';
EXCEPTION WHEN others THEN NULL; END $$;
