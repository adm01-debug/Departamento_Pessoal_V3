-- Endurecimento: remove DML (INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER)
-- de anon/authenticated nas tabelas/views dp_audit_log*.
-- Objetivo: menor privilégio em log de auditoria PII. A RLS já limitava:
--   dp_audit_log (particionada): INSERT só service_role (service_role_insert_only),
--   SELECT authenticated filtrado por actor_user_id (auth_own_events).
-- Os grants de escrita a anon/authenticated eram superfície morta (fatal por RLS)
-- e ferem o princípio do menor privilégio. Aplicado em 14/11/2026 no canônico
-- (frjbfeamybqsejlvmqbl). SELECT de authenticated preservado (leitura do próprio
-- evento via auth_own_events) e service_role intacto.
-- Idempotente: REVOKE de privilégio inexistente emite NOTICE, não erro.

DO $preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname LIKE 'dp_audit_log%' AND c.relnamespace = 'public'::regnamespace) THEN
    RAISE EXCEPTION 'preflight: nenhuma relação dp_audit_log* encontrada';
  END IF;
END
$preflight$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname LIKE 'dp_audit_log%'
      AND c.relkind IN ('r', 'p', 'v')  -- tabela, particionada, view
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated', r.relname);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.relname);
  END LOOP;
END $$;
