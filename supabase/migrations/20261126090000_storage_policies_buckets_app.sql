-- =============================================================================
-- Storage: policies ausentes nos buckets consumidos pelo app
--
-- Auditoria no canonico em 26/11/2026 (canonical-sql-diag runs 45804930887,
-- 45805123950 e 45805172626): storage.buckets tem 20 linhas e storage.objects
-- tem 25 policies. Onze buckets nao tem NENHUMA policy e, sem policy, o
-- Storage aplica deny-by-default — o usuario autenticado recebe
-- "new row violates row-level security policy" no upload e "Object not found"
-- na leitura/assinatura. Oito desses buckets sao usados pelo app:
--
--   bucket                        origem                                  path gravado
--   avatars                       PerfilPage.tsx:199                      {user_id}/avatar.ext
--   documentos-admissao           useDocumentOCR.ts:31,33                 temp/{uuid}.ext
--   ferias-avisos                 useAssinarAvisoFerias.ts:44             {empresa_id}/{ferias_id}.pdf
--   ferias-coletivas-comunicados  useGerarComunicadoColetivas.ts:67       {empresa_id}/{coletiva_id}/arquivo.pdf
--   medidas-contestacoes          medidasDisciplinaresService.ts:172     {empresa_id}/{medida_id}/{uuid}-{arquivo}
--   medidas-disciplinares         medidasDisciplinaresService.ts:104     {empresa_id}/{medida_id}/documento-{uuid}.html
--   ponto-biometria               PontoClockRegister.tsx:192             {empresa_id}/{colaborador_id}/{epoch}.jpg
--   contratos-trabalho            contratoTemplateService.ts:172         {empresa_id}/{admissao_id}/contrato-{uuid}.html
--
-- Escopo: todo bucket cujo primeiro folder e o empresa_id usa o MESMO par das
-- policies vivas no canonico (pol_documentos_*, pol_tenant_*):
--   public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
-- A funcao storage_path_empresa_id devolve NULL quando o primeiro folder nao e
-- UUID, em vez de estourar o cast — e o que evita o erro de
-- "invalid input syntax for type uuid" que a 20261125200000 fechou em outra
-- tabela. Nao reusa ((foldername(name))[1])::uuid das migrations
-- 20260719150000 / 20260724150000 de proposito.
--
-- avatars nao e por tenant e sim por usuario: o criterio e o primeiro folder
-- igual a auth.uid(). O bucket e publico (leitura por URL publica nao passa
-- por RLS), entao a policy de SELECT existe apenas para o proprio dono
-- conseguir listar/assinar o proprio objeto — nao para ler avatar de terceiro.
--
-- documentos-admissao: o front grava em temp/{uuid} sem empresa_id
-- (useDocumentOCR.ts:31). A policy aceita os dois layouts para nao quebrar o
-- upload enquanto a correcao do hook nao sobe:
--   - {empresa_id}/temp/...  -> por tenant
--   - temp/...               -> somente o dono do objeto
--
-- ponto-biometria recebe INSERT (o client so envia) e nao recebe SELECT: nada
-- no app le esse bucket pelo client; quem consome (processar-ponto-offline) usa
-- service_role. Biometria facial e dado sensivel — fica negada por padrao para
-- authenticated em vez de exposta a toda a empresa.
--
-- Idempotente: todo CREATE POLICY tem o DROP POLICY IF EXISTS do mesmo nome.
-- Nenhuma policy de outro bucket e tocada.
-- =============================================================================

-- ─── Guarda fail-closed ─────────────────────────────────────────────────────
-- Os 20 DROP POLICY IF EXISTS abaixo sao silenciosos por natureza: se o bucket
-- ou o contrato de storage.objects mudar, eles passam sem reclamar e as
-- policies novas nascem apontando para um alvo que nao existe. A guarda
-- confere alvo e contrato ANTES de tocar em qualquer coisa.
DO $$
DECLARE buckets_ausentes text; colunas_faltando text;
BEGIN
  SELECT string_agg(b.id, ', ') INTO buckets_ausentes
  FROM (VALUES ('avatars'), ('documentos-admissao'), ('ferias-avisos'),
               ('ferias-coletivas-comunicados'), ('medidas-contestacoes'),
               ('medidas-disciplinares'), ('ponto-biometria'),
               ('contratos-trabalho')) AS b(id)
  WHERE NOT EXISTS (SELECT 1 FROM storage.buckets bk WHERE bk.id = b.id);
  IF buckets_ausentes IS NOT NULL THEN
    RAISE EXCEPTION 'buckets ausentes no canonico: %', buckets_ausentes;
  END IF;

  SELECT string_agg(c.nome, ', ') INTO colunas_faltando
  FROM (VALUES ('bucket_id'), ('name'), ('owner')) AS c(nome)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns col
    WHERE col.table_schema = 'storage' AND col.table_name = 'objects'
      AND col.column_name = c.nome
  );
  IF colunas_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'storage.objects sem as colunas usadas nas policies: %', colunas_faltando;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
    WHERE p.schemaname = 'storage' AND p.tablename = 'objects'
  ) THEN
    RAISE EXCEPTION 'storage.objects ilegivel em pg_policies — contrato de RLS mudou';
  END IF;
END $$;

-- A 20260719150000 (nunca aplicada no canonico) declara um INSERT to public em
-- documentos-admissao, ou seja, upload sem sessao. Se ela entrar num replay
-- futuro depois desta, o furo voltaria — os drops abaixo garantem que nao.
DROP POLICY IF EXISTS "admissao_docs_insert_public" ON storage.objects;
DROP POLICY IF EXISTS "admissao_docs_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "admissao_docs_delete_rh_admin" ON storage.objects;

-- ─── avatars (path: {user_id}/avatar.ext) ───────────────────────────────────
DROP POLICY IF EXISTS "pol_avatars_select_owner" ON storage.objects;
CREATE POLICY "pol_avatars_select_owner"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "pol_avatars_insert_owner" ON storage.objects;
CREATE POLICY "pol_avatars_insert_owner"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- PerfilPage.tsx:199 usa upsert: true — trocar o avatar de um usuario que ja
-- tem arquivo e UPDATE, nao INSERT.
DROP POLICY IF EXISTS "pol_avatars_update_owner" ON storage.objects;
CREATE POLICY "pol_avatars_update_owner"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "pol_avatars_delete_owner" ON storage.objects;
CREATE POLICY "pol_avatars_delete_owner"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── documentos-admissao (path: {empresa_id}/temp/... ou temp/...) ──────────
DROP POLICY IF EXISTS "pol_admissao_docs_insert_tenant_ou_temp" ON storage.objects;
CREATE POLICY "pol_admissao_docs_insert_tenant_ou_temp"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos-admissao'
    AND (
      public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
      OR (
        split_part(name, '/', 1) = 'temp'
        AND owner = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "pol_admissao_docs_select_tenant_ou_temp" ON storage.objects;
CREATE POLICY "pol_admissao_docs_select_tenant_ou_temp"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos-admissao'
    AND (
      public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
      OR (
        split_part(name, '/', 1) = 'temp'
        AND owner = auth.uid()::text
      )
    )
  );

-- ─── ferias-avisos (path: {empresa_id}/{ferias_id}.pdf) ─────────────────────
DROP POLICY IF EXISTS "pol_ferias_avisos_select_tenant" ON storage.objects;
CREATE POLICY "pol_ferias_avisos_select_tenant"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ferias-avisos'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

DROP POLICY IF EXISTS "pol_ferias_avisos_insert_tenant" ON storage.objects;
CREATE POLICY "pol_ferias_avisos_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ferias-avisos'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- useAssinarAvisoFerias.ts:44 usa upsert: true (reassinar o mesmo aviso e UPDATE).
DROP POLICY IF EXISTS "pol_ferias_avisos_update_tenant" ON storage.objects;
CREATE POLICY "pol_ferias_avisos_update_tenant"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ferias-avisos'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  )
  WITH CHECK (
    bucket_id = 'ferias-avisos'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- ─── ferias-coletivas-comunicados (path: {empresa_id}/{coletiva_id}/...) ────
DROP POLICY IF EXISTS "pol_comunicados_coletivas_select_tenant" ON storage.objects;
CREATE POLICY "pol_comunicados_coletivas_select_tenant"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ferias-coletivas-comunicados'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

DROP POLICY IF EXISTS "pol_comunicados_coletivas_insert_tenant" ON storage.objects;
CREATE POLICY "pol_comunicados_coletivas_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ferias-coletivas-comunicados'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- useGerarComunicadoColetivas.ts:20 usa upsert: true.
DROP POLICY IF EXISTS "pol_comunicados_coletivas_update_tenant" ON storage.objects;
CREATE POLICY "pol_comunicados_coletivas_update_tenant"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ferias-coletivas-comunicados'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  )
  WITH CHECK (
    bucket_id = 'ferias-coletivas-comunicados'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- ─── medidas-contestacoes (path: {empresa_id}/{medida_id}/...) ──────────────
DROP POLICY IF EXISTS "pol_medidas_contestacoes_select_tenant" ON storage.objects;
CREATE POLICY "pol_medidas_contestacoes_select_tenant"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'medidas-contestacoes'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

DROP POLICY IF EXISTS "pol_medidas_contestacoes_insert_tenant" ON storage.objects;
CREATE POLICY "pol_medidas_contestacoes_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'medidas-contestacoes'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- ─── medidas-disciplinares (path: {empresa_id}/{medida_id}/documento-*.html) ─
-- O PDF/HTML e gravado pela edge gerar-medida-disciplinar-pdf (service_role);
-- o client so assina a leitura (medidasDisciplinaresService.ts:104).
DROP POLICY IF EXISTS "pol_medidas_disciplinares_select_tenant" ON storage.objects;
CREATE POLICY "pol_medidas_disciplinares_select_tenant"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'medidas-disciplinares'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- ─── ponto-biometria (path: {empresa_id}/{colaborador_id}/{epoch}.jpg) ──────
DROP POLICY IF EXISTS "pol_ponto_biometria_insert_tenant" ON storage.objects;
CREATE POLICY "pol_ponto_biometria_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ponto-biometria'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- ─── contratos-trabalho (path: {empresa_id}/{admissao_id}/contrato-*.html) ──
-- Mesmo caso: quem grava e a edge gerar-contrato-pdf (service_role).
DROP POLICY IF EXISTS "pol_contratos_trabalho_select_tenant" ON storage.objects;
CREATE POLICY "pol_contratos_trabalho_select_tenant"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contratos-trabalho'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );