-- =============================================================================
-- storage: policies tenant-scoped para os buckets de documento de pessoal
--
-- DIAGNOSTICO (conferido no canonico frjbfeamybqsejlvmqbl em 17/11/2026):
-- `storage.objects` tem RLS LIGADA e 15 policies, cobrindo 5 buckets
-- (comprovantes-despesas, contabilidade-anexos, relatorios-privados,
-- sst-programas, training-images + backups por service_role).
--
-- Os buckets `documentos`, `documentos-colaboradores` e `afastamentos` tem
-- ZERO policy. Com RLS ligada e nenhuma policy, toda operacao do usuario
-- autenticado neles e NEGADA — e o banco confirma a consequencia:
--   SELECT count(*) FROM storage.objects WHERE bucket_id='documentos'  ->  0
-- Nunca foi possivel subir arquivo nenhum ali.
--
-- A CAUSA: `20260724150000_t008_storage_tenant_path_scope.sql` existe no
-- repositorio da main e cria exatamente essas policies, mas NAO esta no ledger
-- do canonico — nunca rodou. Esta migration faz o trabalho dela, com duas
-- correcoes deliberadas.
--
-- CORRECAO 1 — helper SEGURO em vez do cru
-- A t008 usa `((storage.foldername(name))[1])::uuid`, que **estoura** se o
-- caminho nao comecar por um uuid valido. Aqui usamos
-- `public.storage_path_empresa_id(name)`, que valida o formato por regex e
-- devolve NULL (negando, sem erro) em caminho malformado. E o mesmo helper que
-- as policies JA aplicadas do `comprovantes-despesas` usam, e o mesmo da
-- `20261117170000` (policy de DELETE do `documentos`).
--
-- CORRECAO 2 — `comprovantes-despesas` fica de FORA
-- A t008 tambem criaria `comprovantes_despesas_select`/`_insert`. Produção ja
-- tem `tenant_select_comprovantes_despesas` e `tenant_insert_comprovantes_despesas`,
-- com nomes DIFERENTES — entao o `DROP POLICY IF EXISTS` da t008 nao removeria
-- as existentes e o bucket terminaria com DUAS policies PERMISSIVE por comando.
-- No Postgres, policies PERMISSIVE entram em OU. As de producao usam o helper
-- seguro E, em UPDATE/DELETE, exigem tambem `owner = auth.uid() OR
-- user_can_manage_...`; a versao da t008 nao exige. Somar a dela afrouxaria o
-- que ja esta correto. Esse bucket NAO e tocado aqui.
--
-- `documentos-admissao` segue intocado, pela mesma razao que a t008 registrava:
-- recebe documento por fluxo com token ANTES de o usuario ter vinculo de
-- empresa, entao nao da para exigir `empresa_id` no caminho.
--
-- O DELETE do `documentos` ja foi resolvido pela 20261117170000
-- (`documentos_delete_rh_admin`) e nao e recriado aqui.
-- =============================================================================

-- ─── documentos ───────────────────────────────────────────────────────────────
-- audit-migration-style: allow-silent-drop policy inexistente no canonico (conferido: 0 policies no bucket); DROP e so para reaplicacao
DROP POLICY IF EXISTS "documentos_select_authenticated" ON storage.objects;
CREATE POLICY "documentos_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- audit-migration-style: allow-silent-drop policy inexistente no canonico (conferido: 0 policies no bucket); DROP e so para reaplicacao
DROP POLICY IF EXISTS "documentos_insert_authenticated" ON storage.objects;
CREATE POLICY "documentos_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- audit-migration-style: allow-silent-drop policy inexistente no canonico (conferido: 0 policies no bucket); DROP e so para reaplicacao
DROP POLICY IF EXISTS "documentos_update_authenticated" ON storage.objects;
CREATE POLICY "documentos_update_authenticated"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  )
  WITH CHECK (
    bucket_id = 'documentos'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- ─── documentos-colaboradores ────────────────────────────────────────────────
-- audit-migration-style: allow-silent-drop policy inexistente no canonico (conferido: 0 policies no bucket); DROP e so para reaplicacao
DROP POLICY IF EXISTS "docs_colab_select_authenticated" ON storage.objects;
CREATE POLICY "docs_colab_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos-colaboradores'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- audit-migration-style: allow-silent-drop policy inexistente no canonico (conferido: 0 policies no bucket); DROP e so para reaplicacao
DROP POLICY IF EXISTS "docs_colab_insert_authenticated" ON storage.objects;
CREATE POLICY "docs_colab_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos-colaboradores'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- ─── afastamentos ─────────────────────────────────────────────────────────────
-- Bucket de atestado/pericia: o conteudo e dado de saude, entao o isolamento
-- por empresa aqui nao e conveniencia, e requisito.
-- audit-migration-style: allow-silent-drop policy inexistente no canonico (conferido: 0 policies no bucket); DROP e so para reaplicacao
DROP POLICY IF EXISTS "afastamentos_select_authenticated" ON storage.objects;
CREATE POLICY "afastamentos_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'afastamentos'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- audit-migration-style: allow-silent-drop policy inexistente no canonico (conferido: 0 policies no bucket); DROP e so para reaplicacao
DROP POLICY IF EXISTS "afastamentos_insert_authenticated" ON storage.objects;
CREATE POLICY "afastamentos_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'afastamentos'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );

-- audit-migration-style: allow-silent-drop policy inexistente no canonico (conferido: 0 policies no bucket); DROP e so para reaplicacao
DROP POLICY IF EXISTS "afastamentos_update_authenticated" ON storage.objects;
CREATE POLICY "afastamentos_update_authenticated"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'afastamentos'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  )
  WITH CHECK (
    bucket_id = 'afastamentos'
    AND public.user_belongs_to_empresa(auth.uid(), public.storage_path_empresa_id(name))
  );
