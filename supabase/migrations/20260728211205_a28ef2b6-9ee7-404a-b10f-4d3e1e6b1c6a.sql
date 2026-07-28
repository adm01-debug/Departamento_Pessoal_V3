-- 1) Log de regressões encontradas pela auditoria de políticas
CREATE TABLE IF NOT EXISTS public.sec_policy_regressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tabela TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  cmd TEXT,
  motivo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sec_policy_regressions TO authenticated;
GRANT ALL ON public.sec_policy_regressions TO service_role;

ALTER TABLE public.sec_policy_regressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins leem regressoes de politica" ON public.sec_policy_regressions;
CREATE POLICY "Admins leem regressoes de politica"
  ON public.sec_policy_regressions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_sec_policy_regressions_scan_at
  ON public.sec_policy_regressions (scan_at DESC);

-- 2) Rotina de varredura + alerta
CREATE OR REPLACE FUNCTION public.sec_audit_policies_scan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_scan_at TIMESTAMPTZ := now();
  v_total INT := 0;
  v_nivel TEXT;
BEGIN
  BEGIN
    INSERT INTO public.sec_policy_regressions (scan_at, tabela, policy_name, cmd, motivo)
    SELECT v_scan_at, a.tabela, a.policy_name, a.cmd, a.motivo
    FROM public.sec_audit_policies() a;

    GET DIAGNOSTICS v_total = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    -- Uma auditoria que não roda é pior que nenhuma auditoria: sem este ramo
    -- a ausência de alertas seria lida como "tudo certo".
    INSERT INTO public.historico_alertas (tipo, nivel, valor, limite, mensagem)
    VALUES (
      'seguranca_rls',
      'critico',
      -1,
      0,
      'Falha ao executar a auditoria de políticas RLS: ' || SQLERRM
    );
    RETURN jsonb_build_object('ok', false, 'erro', SQLERRM, 'scan_at', v_scan_at);
  END;

  IF v_total > 0 THEN
    v_nivel := CASE WHEN v_total >= 5 THEN 'critico' ELSE 'atencao' END;

    INSERT INTO public.historico_alertas (tipo, nivel, valor, limite, mensagem)
    VALUES (
      'seguranca_rls',
      v_nivel,
      v_total,
      0,
      format(
        '%s política(s) de acesso com risco de isolamento detectada(s) na varredura de %s. Consulte a Central de Segurança.',
        v_total,
        to_char(v_scan_at, 'DD/MM/YYYY HH24:MI')
      )
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'achados', v_total, 'scan_at', v_scan_at);
END;
$$;

REVOKE ALL ON FUNCTION public.sec_audit_policies_scan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sec_audit_policies_scan() TO service_role;

-- 3) Expurgo do histórico de varreduras (mantém 180 dias)
CREATE OR REPLACE FUNCTION public.sec_policy_regressions_purge()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.sec_policy_regressions
  WHERE scan_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.sec_policy_regressions_purge() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sec_policy_regressions_purge() TO service_role;

-- 4) Agendamento diário
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('sec-audit-policies-daily', 'sec-policy-regressions-purge');

SELECT cron.schedule(
  'sec-audit-policies-daily',
  '0 4 * * *',
  $cron$SELECT public.sec_audit_policies_scan();$cron$
);

SELECT cron.schedule(
  'sec-policy-regressions-purge',
  '30 4 * * 0',
  $cron$SELECT public.sec_policy_regressions_purge();$cron$
);