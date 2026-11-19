\set ON_ERROR_STOP on

-- Fecha o furo que o baseline carrega fielmente. No corte de 31/08/2026 a
-- public.whatsapp_config tinha uma única policy -- "Empresas gerenciam seu
-- próprio WhatsApp" -- PERMISSIVE, role public, FOR ALL e sem WITH CHECK, cuja
-- qual só exigia vínculo em user_empresas: qualquer colaborador logado da
-- empresa lia e escrevia a api_key da Evolution API. Em produção isso foi
-- corrigido pela migration 20261118223000, que cria whatsapp_config_admin_rh
-- sobre public.pode_gerir_rh.
--
-- Este arquivo roda DEPOIS de verify.sql, que confere a fidelidade do restore
-- (inclusive as 598 policies do corte), e NÃO recria a policy final: o helper
-- pode_gerir_rh não existe no baseline. Deixar a tabela com RLS ligada e zero
-- policies é fail-closed -- ninguém alcança a api_key -- e o replay das
-- migrations do ledger repõe whatsapp_config_admin_rh no formato correto.
--
-- Executar como postgres, por último na ordem de restauração.

DROP POLICY IF EXISTS "Empresas gerenciam seu próprio WhatsApp" ON public.whatsapp_config;

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

DO $hardening$
DECLARE
  v_policies int;
  v_rls boolean;
BEGIN
  SELECT count(*) INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'whatsapp_config';
  IF v_policies <> 0 THEN
    RAISE EXCEPTION 'hardening: whatsapp_config deveria ficar sem policies, tem %', v_policies;
  END IF;

  SELECT c.relrowsecurity INTO v_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'whatsapp_config';
  IF v_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'hardening: RLS de whatsapp_config nao ficou ligada';
  END IF;
END
$hardening$;

SELECT 'baseline_hardening_ok' AS result;
