-- As policies de escrita de provisoes_folha e as de historico_calculos_folha
-- derivavam o tenant de uma claim do JWT:
--   current_setting('request.jwt.claims')::jsonb -> 'app_metadata' ->> 'empresa_id'
-- Qualquer usuario authenticated consegue forjar app_metadata no token usado
-- contra o PostgREST, entao a claim NAO serve como autorizacao (o gate
-- scripts/audit-rls-pii.mjs reprova exatamente esse padrao). O predicado
-- canonico de tenant e public.pertence_a_empresa(uuid), que resolve o vinculo
-- em user_empresas a partir de auth.uid() (SECURITY DEFINER, sem confiar em
-- claim do cliente).
-- Nada de regra nova aqui: o que muda e apenas a ORIGEM do tenant.
-- is_admin/has_role da USING continuam iguais aos da versao anterior.
DO $$
BEGIN
  IF to_regclass('public.provisoes_folha') IS NULL
     OR to_regprocedure('public.pertence_a_empresa(uuid)') IS NULL THEN
    RAISE NOTICE '[provisoes_folha] tabela ou helper ausente - policies nao reescritas';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "provisoes_folha_insert" ON public.provisoes_folha;
  CREATE POLICY "provisoes_folha_insert" ON public.provisoes_folha
    FOR INSERT TO authenticated
    WITH CHECK (public.pertence_a_empresa(empresa_id));

  DROP POLICY IF EXISTS "provisoes_folha_update" ON public.provisoes_folha;
  CREATE POLICY "provisoes_folha_update" ON public.provisoes_folha
    FOR UPDATE TO authenticated
    USING (
      public.pertence_a_empresa(empresa_id)
      AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'rh'::app_role))
    )
    WITH CHECK (public.pertence_a_empresa(empresa_id));

  DROP POLICY IF EXISTS "provisoes_folha_delete" ON public.provisoes_folha;
  CREATE POLICY "provisoes_folha_delete" ON public.provisoes_folha
    FOR DELETE TO authenticated
    USING (public.pertence_a_empresa(empresa_id) AND public.is_admin(auth.uid()));

  -- fail-closed: se algum drop passou silenciosamente e a policy nao voltou,
  -- aborta em vez de deixar a tabela sem a regra esperada.
  IF (SELECT count(*) FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'provisoes_folha'
        AND policyname IN ('provisoes_folha_insert','provisoes_folha_update','provisoes_folha_delete')) <> 3 THEN
    RAISE EXCEPTION 'policies de escrita de provisoes_folha nao foram recriadas';
  END IF;
END $$;

DO $$
DECLARE
  v_nome text;
BEGIN
  IF to_regclass('public.historico_calculos_folha') IS NULL
     OR to_regprocedure('public.pertence_a_empresa(uuid)') IS NULL THEN
    RAISE NOTICE '[historico_calculos_folha] tabela ou helper ausente - policies nao reescritas';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "Acesso por empresa historico" ON public.historico_calculos_folha;
  CREATE POLICY "Acesso por empresa historico" ON public.historico_calculos_folha
    FOR SELECT TO authenticated
    USING (public.pertence_a_empresa(empresa_id));

  -- A policy de INSERT tem cedilha/til no nome no banco real. O nome e lido do
  -- catalogo em vez de escrito aqui, para o DROP casar byte a byte
  -- independentemente da codificacao do cliente que roda a migration.
  SELECT p.policyname INTO v_nome
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename = 'historico_calculos_folha'
    AND p.cmd = 'INSERT'
  LIMIT 1;

  IF v_nome IS NOT NULL THEN
    EXECUTE format('DROP POLICY %I ON public.historico_calculos_folha', v_nome);
    EXECUTE format(
      'CREATE POLICY %I ON public.historico_calculos_folha FOR INSERT TO authenticated '
      'WITH CHECK (public.pertence_a_empresa(empresa_id))', v_nome);
  END IF;

  DROP POLICY IF EXISTS "historico_calculos_delete" ON public.historico_calculos_folha;
  CREATE POLICY "historico_calculos_delete" ON public.historico_calculos_folha
    FOR DELETE TO authenticated
    USING (public.pertence_a_empresa(empresa_id) AND public.is_admin(auth.uid()));

  -- fail-closed: exatamente uma policy por comando (SELECT/INSERT/DELETE).
  IF (SELECT count(*) FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'historico_calculos_folha'
        AND policyname IN ('Acesso por empresa historico', v_nome, 'historico_calculos_delete')) <> 3 THEN
    RAISE EXCEPTION 'policies de historico_calculos_folha nao foram recriadas';
  END IF;
END $$;
