-- Sidecar de 20261117170100. Somente leitura: catalogo do Postgres.

-- 1. O trigger existe, na tabela certa, e esta HABILITADO ('O' = origin).
--    tgenabled e o que separa "criado" de "criado e desligado depois".
SELECT CASE WHEN (
  SELECT t.tgenabled = 'O'
    FROM pg_trigger t
   WHERE t.tgname = 'audit_tarefas_onboarding'
     AND t.tgrelid = 'public.tarefas_onboarding'::regclass
     AND NOT t.tgisinternal
) THEN 'ok' ELSE 'FALHOU' END;

-- 2. Cobre os TRES eventos (INSERT=4, UPDATE=16, DELETE=8 em tgtype) e e
--    AFTER ... FOR EACH ROW (bit 1 ligado = ROW; bit 2 desligado = AFTER).
--    Sem isso, "tem trigger" poderia significar so INSERT, por exemplo.
SELECT CASE WHEN (
  SELECT (t.tgtype & 4) > 0 AND (t.tgtype & 16) > 0 AND (t.tgtype & 8) > 0
     AND (t.tgtype & 1) > 0 AND (t.tgtype & 2) = 0
    FROM pg_trigger t
   WHERE t.tgname = 'audit_tarefas_onboarding'
     AND t.tgrelid = 'public.tarefas_onboarding'::regclass
) THEN 'ok' ELSE 'FALHOU' END;

-- 3. Executa a funcao de auditoria compartilhada do projeto, nao outra.
SELECT CASE WHEN (
  SELECT p.proname = 'log_audit_change'
    FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
   WHERE t.tgname = 'audit_tarefas_onboarding'
     AND t.tgrelid = 'public.tarefas_onboarding'::regclass
) THEN 'ok' ELSE 'FALHOU' END;
