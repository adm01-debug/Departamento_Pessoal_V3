-- Sidecar de 20261118223000_whatsapp_config_repoe_policy_admin_rh.sql.
-- Contrato do workflow canonico: toda linha nao-vazia da saida tem de ser
-- literalmente 'ok'. Sem linha nenhuma => reprovado.
--
-- Afirma o estado final inteiro, nao so a existencia da policy:
--   1. RLS ligada;
--   2. exatamente UMA policy na tabela;
--   3. essa policy e whatsapp_config_admin_rh, FOR ALL, role authenticated,
--      com pode_gerir_rh em USING e em WITH CHECK (um WITH CHECK nulo deixaria
--      a escrita presa so ao USING e e justamente o formato da policy antiga);
--   4. a policy permissiva do baseline NAO existe mais;
--   5. anon e PUBLIC nao tem policy propria que alcance a tabela.
SELECT 'ok'
WHERE EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'whatsapp_config' AND c.relrowsecurity
  )
  AND (
    SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'whatsapp_config'
  ) = 1
  AND EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_config'
      AND policyname = 'whatsapp_config_admin_rh'
      AND cmd = 'ALL'
      AND roles = '{authenticated}'
      AND qual LIKE '%pode_gerir_rh%'
      AND with_check LIKE '%pode_gerir_rh%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_config'
      AND policyname = 'Empresas gerenciam seu próprio WhatsApp'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_config'
      AND ('anon' = ANY(roles) OR 'public' = ANY(roles))
  );
