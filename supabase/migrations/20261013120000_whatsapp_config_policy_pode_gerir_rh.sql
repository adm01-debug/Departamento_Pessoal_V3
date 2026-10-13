-- Alinha a policy de whatsapp_config à mesma regra que a edge whatsapp-send
-- usa via requireRh: pode_gerir_rh(empresa) = is_admin(uid) global OU
-- (membro da empresa AND papel 'rh'). A versão anterior exigia membership
-- para admin global, então um admin sem vínculo podia ENVIAR pela edge mas
-- não ler/gravar a configuração pela tela.
-- Usa a variante de 1 argumento: pode_gerir_rh_para(uuid,uuid) é GRANT só p/
-- service_role — authenticated receberia "permission denied" em todo acesso.
DO $$
BEGIN
  DROP POLICY IF EXISTS "whatsapp_config_admin_rh" ON "public"."whatsapp_config";

  CREATE POLICY "whatsapp_config_admin_rh" ON "public"."whatsapp_config"
    TO "authenticated"
    USING (public.pode_gerir_rh("empresa_id"))
    WITH CHECK (public.pode_gerir_rh("empresa_id"));

  -- fail-closed: se o drop falhou silenciosamente ou a policy não foi
  -- recriada, a migration aborta em vez de deixar whatsapp_config aberta.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_config'
      AND policyname = 'whatsapp_config_admin_rh'
  ) THEN
    RAISE EXCEPTION 'policy "whatsapp_config_admin_rh" não foi recriada em whatsapp_config';
  END IF;
END $$;
