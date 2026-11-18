-- =============================================================================
-- Fecha o único gap multi-tenant real remanescente nos buckets `documentos` e
-- `documentos-colaboradores`: as policies de DELETE.
--
-- Auditoria (ver relação completa no PR): SELECT/INSERT/UPDATE nos dois
-- buckets já são tenant-scoped desde 20260724150000_t008_storage_tenant_path_scope.sql,
-- via `user_belongs_to_empresa(auth.uid(), foldername(name)[1]::uuid)` — o
-- path segue o padrão `{empresa_id}/{colaborador_id}/{categoria}/{uuid}.{ext}`.
--
-- DELETE, porém, ficou de fora daquela migration e ainda usa a regra original
-- de 20260719150000_storage_bucket_security_hardening.sql:
--   auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin','rh'))
-- Essa checagem é só de PAPEL, não de TENANT: `user_roles` é global (sem
-- empresa_id — ver public.user_roles), então um admin/RH da empresa A conseguia
-- deletar objetos da empresa B só por ter o role certo, contanto que soubesse
-- (ou adivinhasse) o path.
--
-- Fix: troca a subquery solta por `public.pode_gerir_rh(empresa_id)`, a
-- função já usada pela RLS de nível de tabela mais recente do projeto (ver
-- `documentos_pessoais_arquivos`.`docpessoais_rh_manage`, migration
-- 20260729152119) — ela FAZ os dois requisitos ao mesmo tempo:
--   (1) auth.uid() pertence a `user_empresas` daquela empresa_id, E
--   (2) auth.uid() tem role admin OU rh (via has_role/user_roles)
-- então preserva exatamente a regra "só admin/RH pode apagar" (não amplia
-- nada) e adiciona o isolamento de tenant que faltava.
--
-- Nenhum bucket novo, nenhuma policy nova de SELECT/INSERT/UPDATE — só
-- substitui as 2 policies de DELETE abaixo (DROP + CREATE, sem deixar a
-- versão antiga coexistindo).
-- =============================================================================

DROP POLICY IF EXISTS "documentos_delete_rh_admin" ON storage.objects;
CREATE POLICY "documentos_delete_rh_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND public.pode_gerir_rh(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "docs_colab_delete_rh_admin" ON storage.objects;
CREATE POLICY "docs_colab_delete_rh_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos-colaboradores'
    AND public.pode_gerir_rh(((storage.foldername(name))[1])::uuid)
  );
