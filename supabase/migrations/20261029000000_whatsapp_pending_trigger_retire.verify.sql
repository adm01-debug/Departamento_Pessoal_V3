-- Sidecar de verificação pós-apply (contrato: cada linha não-vazia = 'ok').
SELECT 'ok' WHERE NOT EXISTS (
  SELECT 1 FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'colaboradores'
    AND t.tgname = 'tr_whatsapp_on_new_hiring'
    AND NOT t.tgisinternal
);
SELECT 'ok' WHERE NOT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'fn_trigger_whatsapp_on_event'
);
SELECT 'ok' WHERE NOT EXISTS (
  SELECT 1 FROM public.whatsapp_mensagens_logs
  WHERE status = 'pending_trigger'
);
