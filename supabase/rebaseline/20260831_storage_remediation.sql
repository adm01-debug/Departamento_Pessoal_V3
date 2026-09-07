-- Rebaseline 2026-08-31: catálogo canônico de buckets e RLS de objetos.
-- Convenção obrigatória para buckets privados: {empresa_id}/{escopo}/arquivo.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('afastamentos', 'afastamentos', false, 10485760,
   ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('assinaturas', 'assinaturas', false, 5242880,
   ARRAY['image/png', 'image/jpeg', 'application/pdf']),
  ('avatars', 'avatars', true, 2097152,
   ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('backups', 'backups', false, 1073741824, NULL),
  ('comprovantes-despesas', 'comprovantes-despesas', false, 10485760,
   ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('contabilidade-anexos', 'contabilidade-anexos', false, 20971520,
   ARRAY['application/pdf', 'text/csv',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/xml', 'text/xml']),
  ('contratacao', 'contratacao', false, 20971520,
   ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('contratos-trabalho', 'contratos-trabalho', false, 20971520,
   ARRAY['application/pdf', 'text/html']),
  ('documentos', 'documentos', false, 20971520,
   ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('documentos-admissao', 'documentos-admissao', false, 20971520,
   ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('documentos-colaboradores', 'documentos-colaboradores', false, 20971520,
   ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('ferias-avisos', 'ferias-avisos', false, 10485760,
   ARRAY['application/pdf']),
  ('ferias-coletivas-comunicados', 'ferias-coletivas-comunicados', false, 10485760,
   ARRAY['application/pdf']),
  ('medidas-contestacoes', 'medidas-contestacoes', false, 10485760,
   ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('medidas-disciplinares', 'medidas-disciplinares', false, 20971520,
   ARRAY['application/pdf', 'text/html']),
  ('ponto-biometria', 'ponto-biometria', false, 5242880,
   ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('recrutamento-curriculos', 'recrutamento-curriculos', false, 20971520,
   ARRAY['application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('relatorios-privados', 'relatorios-privados', false, 20971520,
   ARRAY['application/pdf', 'text/csv', 'application/json']),
  ('sst-programas', 'sst-programas', false, 20971520,
   ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.storage_path_empresa_id(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT CASE
    WHEN (storage.foldername(p_name))[1] ~
         '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN ((storage.foldername(p_name))[1])::uuid
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.storage_path_colaborador_id(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT CASE
    WHEN (storage.foldername(p_name))[2] ~
         '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN ((storage.foldername(p_name))[2])::uuid
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.storage_user_is_path_colaborador(
  p_user_id uuid,
  p_name text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  -- colaboradores não tem user_id; o vínculo com auth.users é por e-mail
  -- (mesmo padrão de ferias_programacao/cnab_remessas). O AND c.empresa_id =
  -- ... já presente abaixo impede o cruzamento entre tenants mesmo que dois
  -- colaboradores de empresas diferentes compartilhem e-mail.
  SELECT p_user_id = auth.uid()
     AND EXISTS (
       SELECT 1
       FROM public.colaboradores c
       WHERE c.id = public.storage_path_colaborador_id(p_name)
         AND c.empresa_id = public.storage_path_empresa_id(p_name)
         AND c.email = (SELECT u.email FROM auth.users u WHERE u.id = p_user_id)
     );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_tenant_storage(
  p_user_id uuid,
  p_empresa_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT (p_user_id = auth.uid() OR auth.uid() IS NULL)
     AND public.user_belongs_to_empresa(p_user_id, p_empresa_id)
     AND (
       public.has_role(p_user_id, 'admin'::public.app_role)
       OR public.has_role(p_user_id, 'gestor'::public.app_role)
       OR public.has_role(p_user_id, 'rh'::public.app_role)
     );
$$;

REVOKE ALL ON FUNCTION public.storage_path_empresa_id(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.storage_path_colaborador_id(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.storage_user_is_path_colaborador(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_can_manage_tenant_storage(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_path_empresa_id(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storage_path_colaborador_id(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storage_user_is_path_colaborador(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_tenant_storage(uuid, uuid) TO authenticated, service_role;

-- Remove todas as políticas de objeto da aplicação. As políticas gerenciadas
-- pelo Storage, se surgirem no futuro, não usam os prefixos abaixo e ficam fora.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        policyname LIKE 'tenant\_%' ESCAPE '\'
        OR policyname LIKE 'avatars\_%' ESCAPE '\'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
  END LOOP;
END;
$$;

-- Avatar: leitura pública pelo bucket público; mutação só no diretório do uid.
CREATE POLICY avatars_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY avatars_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY avatars_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DO $$
DECLARE
  b text;
  readable_buckets text[] := ARRAY[
    'afastamentos', 'assinaturas', 'comprovantes-despesas',
    'contabilidade-anexos', 'contratacao', 'contratos-trabalho', 'documentos',
    'documentos-admissao', 'documentos-colaboradores', 'ferias-avisos',
    'ferias-coletivas-comunicados', 'medidas-contestacoes',
    'medidas-disciplinares', 'ponto-biometria',
    'recrutamento-curriculos', 'relatorios-privados', 'sst-programas'
  ];
  writable_buckets text[] := ARRAY[
    'afastamentos', 'assinaturas', 'comprovantes-despesas',
    'contabilidade-anexos', 'contratacao', 'documentos',
    'documentos-admissao', 'documentos-colaboradores', 'ferias-avisos',
    'ferias-coletivas-comunicados', 'medidas-contestacoes', 'ponto-biometria',
    'recrutamento-curriculos'
  ];
  self_service_buckets text[] := ARRAY['documentos', 'ponto-biometria'];
  can_self boolean;
BEGIN
  FOREACH b IN ARRAY readable_buckets LOOP
    can_self := b = ANY(self_service_buckets);
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated
       USING (
         bucket_id = %L
         AND (
           public.user_can_manage_tenant_storage(
             auth.uid(), public.storage_path_empresa_id(name))
           OR (%L AND public.storage_user_is_path_colaborador(auth.uid(), name))
         )
       )',
      'tenant_select_' || replace(b, '-', '_'), b, can_self
    );
  END LOOP;

  FOREACH b IN ARRAY writable_buckets LOOP
    can_self := b = ANY(self_service_buckets);
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated
       WITH CHECK (
         bucket_id = %L
         AND owner = auth.uid()
         AND (
           public.user_can_manage_tenant_storage(
             auth.uid(), public.storage_path_empresa_id(name))
           OR (%L AND public.storage_user_is_path_colaborador(auth.uid(), name))
         )
       )',
      'tenant_insert_' || replace(b, '-', '_'), b, can_self
    );

    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated
       USING (
         bucket_id = %L
         AND owner = auth.uid()
         AND (
           public.user_can_manage_tenant_storage(
             auth.uid(), public.storage_path_empresa_id(name))
           OR (%L AND public.storage_user_is_path_colaborador(auth.uid(), name))
         )
       )
       WITH CHECK (
         bucket_id = %L
         AND owner = auth.uid()
         AND (
           public.user_can_manage_tenant_storage(
             auth.uid(), public.storage_path_empresa_id(name))
           OR (%L AND public.storage_user_is_path_colaborador(auth.uid(), name))
         )
       )',
      'tenant_update_' || replace(b, '-', '_'), b, can_self, b, can_self
    );

    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated
       USING (
         bucket_id = %L
         AND owner = auth.uid()
         AND (
           public.user_can_manage_tenant_storage(
             auth.uid(), public.storage_path_empresa_id(name))
           OR (%L AND public.storage_user_is_path_colaborador(auth.uid(), name))
         )
       )',
      'tenant_delete_' || replace(b, '-', '_'), b, can_self
    );
  END LOOP;
END;
$$;
