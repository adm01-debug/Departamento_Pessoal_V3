-- public.record_backup_run() e SECURITY DEFINER e nasceu sem GRANT explicito:
-- o Postgres concede EXECUTE a PUBLIC na criacao, entao anon e authenticated
-- alcancam a funcao pela API e gravam linhas arbitrarias em public.backup_logs
-- (registro de backup forjado, com status e datas escolhidos pelo cliente).
-- O gate scripts/audit-secdef-authz.mjs reprova exatamente esse padrao.
-- Nao ha chamador via API: a rotina e de cron/servico. Fecha para
-- PUBLIC/anon/authenticated e mantem service_role.
--
-- Na mesma tabela, a policy "backup_logs_tenant_all" (20261124150000) deriva o
-- tenant de public.get_auth_empresa_id(), que le app_metadata do JWT -- claim
-- forjavel pelo cliente e marcada OBSOLETA no proprio banco. Troca para
-- public.pertence_a_empresa(empresa_id): mesma regra, origem confiavel.
-- Aditiva e idempotente: nao apaga dados.
DO $$
DECLARE
  v_sig text := 'public.record_backup_run(uuid,text,integer,integer,integer,text,uuid,jsonb)';
BEGIN
  IF to_regprocedure(v_sig) IS NULL THEN
    RAISE NOTICE '[record_backup_run] ausente - privilegios nao alterados';
    RETURN;
  END IF;

  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', v_sig);
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', v_sig);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', v_sig);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_sig);
  END IF;

  -- fail-closed: se o REVOKE nao pegou, aborta em vez de deixar o buraco aberto.
  IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated')) > 0
     AND (has_function_privilege('anon', v_sig, 'EXECUTE')
          OR has_function_privilege('authenticated', v_sig, 'EXECUTE')) THEN
    RAISE EXCEPTION 'record_backup_run continua executavel por anon/authenticated';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.backup_logs') IS NULL
     OR to_regprocedure('public.pertence_a_empresa(uuid)') IS NULL THEN
    RAISE NOTICE '[backup_logs] tabela ou helper ausente - policy nao reescrita';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "backup_logs_tenant_all" ON public.backup_logs';
  EXECUTE 'CREATE POLICY "backup_logs_tenant_all" ON public.backup_logs
    FOR ALL TO authenticated
    USING (public.pertence_a_empresa(empresa_id))
    WITH CHECK (public.pertence_a_empresa(empresa_id))';

  IF (SELECT count(*) FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'backup_logs'
        AND policyname = 'backup_logs_tenant_all') <> 1 THEN
    RAISE EXCEPTION 'policy de backup_logs nao foi recriada';
  END IF;
END $$;
