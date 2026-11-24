\set ON_ERROR_STOP on

-- O bootstrap local do Supabase aplica default privileges mais amplos que os
-- existentes no canônico. Estes revokes tornam o restore semanticamente igual
-- ao dump remoto. Executar depois do schema e antes da validação final.
REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN
  ON TABLE public.pii_access_alerts
  FROM anon, authenticated;

REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN
  ON TABLE public.pii_access_logs
  FROM anon, authenticated;

REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN
  ON TABLE public.v_pii_access_suspeitos
  FROM anon;
