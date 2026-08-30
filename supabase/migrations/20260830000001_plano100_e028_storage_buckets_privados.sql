-- ============================================================================
-- PLANO_100 · E-028 · [P1] · banco/Storage — criar buckets privados ausentes
-- Corrige: A-005, A-018
-- ----------------------------------------------------------------------------
-- 1) Cria os 4 buckets esperados pelo app sem migration própria:
--      comprovantes-despesas, contabilidade-anexos, relatorios-privados,
--      sst-programas   (todos PRIVADOS — acesso via createSignedUrl)
-- 2) Hardening: força `public = false` em buckets criados públicos por engano
--    (documentos-admissao em 20251220151012; ponto-biometria em 20260513182833).
-- 3) Policies tenant-scoped: path <empresa_id>/<arquivo>, acesso só de membros.
-- Idempotente: ON CONFLICT DO NOTHING / UPDATE com guarda / DROP IF EXISTS.
-- ============================================================================

-- ── 1. Buckets ausentes (privados) ─────────────────────────────────────────
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
ON CONFLICT (id) DO NOTHING;

-- ── 2. Hardening: buckets de negócio jamais públicos ───────────────────────
-- documentos-admissão contém PII (RG/CPF); biometria é dado sensível
-- (LGPD art. 11). URL pública previsível é inaceitável.
UPDATE storage.buckets
SET public = false
WHERE id IN (
  'afastamentos', 'assinaturas', 'comprovantes-despesas', 'contabilidade-anexos',
  'contratacao', 'documentos', 'documentos-admissao', 'documentos-colaboradores',
  'ferias-avisos', 'ferias-coletivas-comunicados', 'ponto-biometria',
  'recrutamento-curriculos', 'relatorios-privados', 'sst-programas'
)
AND public = true;
-- NOTA: 'avatars' permanece público por decisão de produto (fotos de perfil
-- exibidas sem URL assinada). Não contém documento nem dado sensível.

-- ── 3. Helper: 1º segmento do path como empresa_id (sem cast error) ────────
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

REVOKE ALL ON FUNCTION public.storage_path_empresa_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.storage_path_empresa_id(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.storage_path_empresa_id(text) TO authenticated;

-- ── 4. Policies tenant-scoped para os novos buckets ────────────────────────
-- Convenção de path: <empresa_id>/<...arquivo>
DO $$
DECLARE
  b text;
  buckets text[] := ARRAY[
    'comprovantes-despesas', 'contabilidade-anexos',
    'relatorios-privados', 'sst-programas'
  ];
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects',
      'tenant_select_' || replace(b, '-', '_'));
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated
       USING (
         bucket_id = %L
         AND public.storage_path_empresa_id(name) IS NOT NULL
         AND public.user_belongs_to_empresa(
               auth.uid(), public.storage_path_empresa_id(name))
       )',
      'tenant_select_' || replace(b, '-', '_'), b);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects',
      'tenant_insert_' || replace(b, '-', '_'));
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated
       WITH CHECK (
         bucket_id = %L
         AND public.storage_path_empresa_id(name) IS NOT NULL
         AND public.user_belongs_to_empresa(
               auth.uid(), public.storage_path_empresa_id(name))
       )',
      'tenant_insert_' || replace(b, '-', '_'), b);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects',
      'tenant_update_' || replace(b, '-', '_'));
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated
       USING (
         bucket_id = %L
         AND public.storage_path_empresa_id(name) IS NOT NULL
         AND public.user_belongs_to_empresa(
               auth.uid(), public.storage_path_empresa_id(name))
       )',
      'tenant_update_' || replace(b, '-', '_'), b);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON storage.objects',
      'tenant_delete_' || replace(b, '-', '_'));
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated
       USING (
         bucket_id = %L
         AND public.storage_path_empresa_id(name) IS NOT NULL
         AND public.user_belongs_to_empresa(
               auth.uid(), public.storage_path_empresa_id(name))
       )',
      'tenant_delete_' || replace(b, '-', '_'), b);
  END LOOP;
END $$;

-- ── Verificação (preview antes de promover) ────────────────────────────────
-- SELECT id, public FROM storage.buckets WHERE id IN
--   ('comprovantes-despesas','contabilidade-anexos','relatorios-privados',
--    'sst-programas','documentos-admissao','ponto-biometria');
--   -- esperado: public = false em todas
-- SELECT count(*) FROM pg_policies WHERE schemaname = 'storage'
--   AND tablename = 'objects' AND policyname LIKE 'tenant\_%';
--   -- esperado: 16 (4 buckets × 4 comandos)
