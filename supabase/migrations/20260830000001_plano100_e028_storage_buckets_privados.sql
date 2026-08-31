-- PLANO_100 · E-028 · Storage privado e isolamento por tenant.
-- Compatível com o schema canônico self-hosted (user_empresas.role/app_role).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('comprovantes-despesas', 'comprovantes-despesas', false, 10485760,
   ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('contabilidade-anexos', 'contabilidade-anexos', false, 20971520,
   ARRAY['application/pdf', 'text/csv',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/xml', 'text/xml']),
  ('relatorios-privados', 'relatorios-privados', false, 20971520,
   ARRAY['application/pdf', 'text/csv']),
  ('sst-programas', 'sst-programas', false, 20971520,
   ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets
SET public = false
WHERE id IN (
  'afastamentos', 'assinaturas', 'comprovantes-despesas', 'contabilidade-anexos',
  'contratacao', 'documentos', 'documentos-admissao', 'documentos-colaboradores',
  'ferias-avisos', 'ferias-coletivas-comunicados', 'ponto-biometria',
  'recrutamento-curriculos', 'relatorios-privados', 'sst-programas'
)
AND public = true;

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

CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(p_user_id uuid, p_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_empresas ue
    WHERE ue.user_id = p_user_id
      AND ue.empresa_id = p_empresa_id
      AND ue.ativo IS TRUE
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
  SELECT EXISTS (
    SELECT 1
    FROM public.user_empresas ue
    WHERE ue.user_id = p_user_id
      AND ue.empresa_id = p_empresa_id
      AND ue.ativo IS TRUE
      AND ue.role::text IN ('admin', 'manager', 'supervisor')
  );
$$;

REVOKE ALL ON FUNCTION public.storage_path_empresa_id(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_belongs_to_empresa(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_can_manage_tenant_storage(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_path_empresa_id(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_empresa(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_tenant_storage(uuid, uuid) TO authenticated, service_role;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  b text;
  readable_buckets text[] := ARRAY[
    'comprovantes-despesas', 'contabilidade-anexos',
    'relatorios-privados', 'sst-programas'
  ];
  writable_buckets text[] := ARRAY[
    'comprovantes-despesas', 'contabilidade-anexos'
  ];
BEGIN
  FOREACH b IN ARRAY readable_buckets LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects',
      'tenant_select_' || replace(b, '-', '_'));
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated
       USING (
         bucket_id = %L
         AND public.user_belongs_to_empresa(
           auth.uid(), public.storage_path_empresa_id(name))
       )',
      'tenant_select_' || replace(b, '-', '_'), b);

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects',
      'tenant_insert_' || replace(b, '-', '_'));
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects',
      'tenant_update_' || replace(b, '-', '_'));
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects',
      'tenant_delete_' || replace(b, '-', '_'));
  END LOOP;

  FOREACH b IN ARRAY writable_buckets LOOP
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated
       WITH CHECK (
         bucket_id = %L
         AND owner = auth.uid()
         AND public.user_belongs_to_empresa(
           auth.uid(), public.storage_path_empresa_id(name))
       )',
      'tenant_insert_' || replace(b, '-', '_'), b);

    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated
       USING (
         bucket_id = %L
         AND public.user_belongs_to_empresa(
           auth.uid(), public.storage_path_empresa_id(name))
         AND (owner = auth.uid() OR public.user_can_manage_tenant_storage(
           auth.uid(), public.storage_path_empresa_id(name)))
       )
       WITH CHECK (
         bucket_id = %L
         AND public.user_belongs_to_empresa(
           auth.uid(), public.storage_path_empresa_id(name))
         AND (owner = auth.uid() OR public.user_can_manage_tenant_storage(
           auth.uid(), public.storage_path_empresa_id(name)))
       )',
      'tenant_update_' || replace(b, '-', '_'), b, b);

    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated
       USING (
         bucket_id = %L
         AND public.user_belongs_to_empresa(
           auth.uid(), public.storage_path_empresa_id(name))
         AND (owner = auth.uid() OR public.user_can_manage_tenant_storage(
           auth.uid(), public.storage_path_empresa_id(name)))
       )',
      'tenant_delete_' || replace(b, '-', '_'), b);
  END LOOP;
END $$;
