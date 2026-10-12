-- whatsapp_config guarda api_key da instância Evolution API. A policy
-- original ("Empresas gerenciam seu próprio WhatsApp", FOR ALL) deixava
-- QUALQUER membro da empresa ler a chave via PostgREST/bridge e reutilizá-la
-- fora do remetente oficial. Gestão da config é papel de admin/rh — mesmo
-- escopo que a edge whatsapp-send exige via requireRh.
DROP POLICY IF EXISTS "Empresas gerenciam seu próprio WhatsApp" ON "public"."whatsapp_config";

CREATE POLICY "whatsapp_config_admin_rh" ON "public"."whatsapp_config"
  TO "authenticated"
  USING (
    "empresa_id" IN (SELECT "public"."get_user_empresas"("auth"."uid"()))
    AND (
      "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")
      OR "public"."has_role"("auth"."uid"(), 'rh'::"public"."app_role")
    )
  )
  WITH CHECK (
    "empresa_id" IN (SELECT "public"."get_user_empresas"("auth"."uid"()))
    AND (
      "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")
      OR "public"."has_role"("auth"."uid"(), 'rh'::"public"."app_role")
    )
  );
