-- ============================================================================
-- backup_logs: habilita RLS e cria a policy tenant-scoped
-- ----------------------------------------------------------------------------
-- A 20260725100000_p3_060_backup_logs.sql cria public.backup_logs com
-- "CREATE TABLE IF NOT EXISTS" mas nao habilita RLS nem cria policy. O canonico
-- nunca teve essa tabela (diagnostico read-only de 24/11/2026: backup_logs=f),
-- entao ela nasceria com RLS desligado e, por causa dos GRANTs default do
-- Supabase em public, ficaria legivel por qualquer requisicao anon/authenticated
-- sem filtro de tenant. A 20260816000000_p1_024_policies_orfas.sql tem a policy
-- equivalente, mas esta fora da lista curada do apply; esta migration traz a
-- mesma policy com o ENABLE RLS que faltava nos dois caminhos.
-- Aditiva e idempotente: so age se a tabela existir e nunca apaga dados.
-- ============================================================================
DO $$
BEGIN
  IF to_regclass('public.backup_logs') IS NULL THEN
    RAISE NOTICE '[backup_logs] ausente - RLS nao aplicado';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY';
  EXECUTE 'REVOKE ALL ON public.backup_logs FROM anon';

  EXECUTE 'DROP POLICY IF EXISTS "backup_logs_tenant_all" ON public.backup_logs';
  EXECUTE 'CREATE POLICY "backup_logs_tenant_all" ON public.backup_logs
    FOR ALL TO authenticated
    USING (empresa_id = public.get_auth_empresa_id())
    WITH CHECK (empresa_id = public.get_auth_empresa_id())';

  EXECUTE 'COMMENT ON TABLE public.backup_logs IS '
    || quote_literal('Log de execucao de backup. RLS por empresa; backup global (empresa_id NULL) visivel apenas para service_role.');
END $$;
