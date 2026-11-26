-- whatsapp_config guarda a api_key da instancia Evolution API.
--
-- Estado medido em producao hoje (18/11/2026), via pg_policies: a tabela tem
-- UMA policy, "Empresas gerenciam seu proprio WhatsApp" (PERMISSIVE, role
-- public, FOR ALL, with_check NULL), cujo qual e apenas
--   auth.uid() IN (SELECT user_id FROM user_empresas WHERE empresa_id = ...)
-- ou seja: qualquer vinculado a empresa -- inclusive papel 'colaborador' --
-- le e grava a chave da API.
--
-- As versoes 20261012150000 e 20261013120000 estao no ledger canonico e
-- deveriam ter trocado essa policy por whatsapp_config_admin_rh, mas a policy
-- antiga esta de volta e a nova nao existe: o estado foi reposto a partir de
-- supabase/baseline/20260831_canonical/canonical_schema.sql, que carrega a
-- policy permissiva. O ledger registra a versao, nao o DDL em vigor.
--
-- Esta migration repoe o alvo com a MESMA regra da 20261013120000 --
-- pode_gerir_rh(empresa) = is_admin(uid) global OU (membro AND papel 'rh') --
-- que e a mesma que a edge whatsapp-send exige via requireRh. Usa a variante
-- de 1 argumento: pode_gerir_rh_para(uuid,uuid) e GRANT so para service_role e
-- daria "permission denied" para authenticated.
--
-- Idempotente e fail-closed: se o estado final nao for exatamente uma policy
-- admin/rh, aborta em vez de deixar whatsapp_config aberta.
DO $$
DECLARE
  v_policies int;
BEGIN
  DROP POLICY IF EXISTS "Empresas gerenciam seu próprio WhatsApp" ON "public"."whatsapp_config";
  DROP POLICY IF EXISTS "whatsapp_config_admin_rh" ON "public"."whatsapp_config";

  CREATE POLICY "whatsapp_config_admin_rh" ON "public"."whatsapp_config"
    TO "authenticated"
    USING (public.pode_gerir_rh("empresa_id"))
    WITH CHECK (public.pode_gerir_rh("empresa_id"));

  SELECT count(*) INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'whatsapp_config';

  IF v_policies <> 1 THEN
    RAISE EXCEPTION 'whatsapp_config deveria ter exatamente 1 policy, tem %', v_policies;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_config'
      AND policyname = 'whatsapp_config_admin_rh'
      AND cmd = 'ALL'
      AND roles = '{authenticated}'
      AND qual LIKE '%pode_gerir_rh%'
      AND with_check LIKE '%pode_gerir_rh%'
  ) THEN
    RAISE EXCEPTION 'policy whatsapp_config_admin_rh nao ficou no formato esperado';
  END IF;
END $$;

-- RLS ja esta ligada em producao; reafirmado aqui para a reconstrucao
-- cronologica, em que a ordem de criacao da tabela vem do baseline.
ALTER TABLE "public"."whatsapp_config" ENABLE ROW LEVEL SECURITY;
