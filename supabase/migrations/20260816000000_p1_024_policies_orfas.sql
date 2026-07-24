-- ============================================================================
-- P1-024: Adiciona policies em tabelas com RLS mas sem policy
-- ----------------------------------------------------------------------------
-- Tabelas com RLS habilitado mas sem policy são deny-by-default no PostgreSQL,
-- tornando-as inacessíveis. Esta migration identifica e adiciona policies
-- default para tabelas conhecidas.
-- ============================================================================

-- Query helper (read-only — não persiste)
-- Lista tabelas com RLS habilitado mas sem nenhuma policy
DO $$
DECLARE
  r RECORD;
  cnt INT := 0;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'  -- regular table
      AND c.relrowsecurity = true
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.tablename = c.relname AND p.schemaname = 'public'
      )
  LOOP
    RAISE NOTICE '[P1-024] Tabela %.% tem RLS sem policy — inacessível', 'public', r.table_name;
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE '[P1-024] % tabela(s) órfã(s) detectadas', cnt;
END $$;

-- Adiciona policies default para tabelas conhecidas que ficaram sem policy
-- após varredura dinâmica (defesa em profundidade)

-- backup_logs (pode ter ficado órfão após alguma migration)
DROP POLICY IF EXISTS "backup_logs_tenant_all" ON public.backup_logs;
CREATE POLICY "backup_logs_tenant_all" ON public.backup_logs
  FOR ALL TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- contratos (caso exista sem policy)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'contratos' AND c.relrowsecurity = true)
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contratos' AND schemaname = 'public')
  THEN
    EXECUTE 'CREATE POLICY "contratos_tenant_all" ON public.contratos
      FOR ALL TO authenticated
      USING (empresa_id = public.get_auth_empresa_id())
      WITH CHECK (empresa_id = public.get_auth_empresa_id())';
  END IF;
END $$;

-- salario_historico (caso exista)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'salario_historico' AND c.relrowsecurity = true)
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'salario_historico' AND schemaname = 'public')
  THEN
    EXECUTE 'CREATE POLICY "salario_historico_tenant_all" ON public.salario_historico
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.colaboradores c
          WHERE c.id = salario_historico.colaborador_id
            AND c.empresa_id = public.get_auth_empresa_id()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.colaboradores c
          WHERE c.id = salario_historico.colaborador_id
            AND c.empresa_id = public.get_auth_empresa_id()
        )
      )';
  END IF;
END $$;

COMMENT ON TABLE public.backup_logs IS
  '[P1-024] Policy default adicionada (tenant-scoped).';
