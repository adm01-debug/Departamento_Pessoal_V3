-- Alinha a policy de whatsapp_config à mesma regra que a edge whatsapp-send
-- usa via requireRh: pode_gerir_rh_para(uid, empresa) = is_admin(uid) global
-- OU (membro da empresa AND papel 'rh'). A versão anterior exigia membership
-- para admin global, então um admin sem vínculo podia ENVIAR pela edge mas
-- não ler/gravar a configuração pela tela.
DROP POLICY IF EXISTS "whatsapp_config_admin_rh" ON "public"."whatsapp_config";

CREATE POLICY "whatsapp_config_admin_rh" ON "public"."whatsapp_config"
  TO "authenticated"
  USING (public.pode_gerir_rh_para(auth.uid(), "empresa_id"))
  WITH CHECK (public.pode_gerir_rh_para(auth.uid(), "empresa_id"));
