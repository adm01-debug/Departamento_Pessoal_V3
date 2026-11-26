-- =============================================================================
-- storage: RH passa a ler os anexos que o candidato enviou em /contratacao
--
-- DIAGNOSTICO
-- A edge function `admissao-publica` grava o arquivo do candidato no bucket
-- `documentos`, com o caminho `admissao_<admissao_id>/<tipo>_<timestamp>.<ext>`
-- (service_role, depois de validar o token). As policies tenant do bucket
-- (`20261117193000` + `20261126090000`) derivam a empresa da PRIMEIRA pasta do
-- caminho, via `public.storage_path_empresa_id(name)`, que exige um UUID ali.
-- Em `admissao_<uuid>/...` essa primeira pasta nao e UUID: o helper devolve
-- NULL e a policy DENEGA. Consequencia real: o RH nao abria NENHUM documento
-- enviado pelo candidato -- o arquivo existia no bucket e ninguem conseguia ler.
--
-- CORRECAO
-- Uma policy de SELECT adicional (policies PERMISSIVE somam em OU -- as
-- existentes nao sao tocadas) que resolve a empresa pela ADMISSAO do caminho:
-- `admissao_<uuid>` -> `admissoes.id` -> `admissoes.empresa_id` ->
-- `user_belongs_to_empresa(auth.uid(), empresa_id)`.
--
-- Isolamento por tenant: o candidato nao tem vinculo, entao nada e concedido a
-- `anon`; a leitura continua exigindo usuario autenticado PERTENCENTE a empresa
-- dona da admissao. Caminho fora do padrao `admissao_<uuid>/` devolve NULL no
-- helper e a policy nao casa -- sem erro e sem vazamento (fail-closed).
--
-- Escopo: SO SELECT. Upload/UPDATE/DELETE do bucket seguem exatamente como
-- estavam: o candidato escreve pela edge (service_role) e o RH nao altera
-- anexo de admissao.
--
-- Idempotente (cria so se ausente) e reversivel: DROP da policy e da funcao.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.storage_path_admissao_id(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT CASE
           WHEN p_name ~ '^admissao_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
             THEN replace(split_part(p_name, '/', 1), 'admissao_', '')::uuid
           ELSE NULL
         END;
$$;

COMMENT ON FUNCTION public.storage_path_admissao_id(text) IS
  'Extrai o admissao_id de um caminho de storage no formato admissao_<uuid>/... e devolve NULL (negando, sem erro) em qualquer outro formato.';

REVOKE ALL ON FUNCTION public.storage_path_admissao_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_path_admissao_id(text) TO authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_policies
     WHERE pg_catalog.pg_policies.schemaname = 'storage'
       AND pg_catalog.pg_policies.tablename = 'objects'
       AND pg_catalog.pg_policies.policyname = 'documentos_select_admissao_tenant'
  ) THEN
    CREATE POLICY "documentos_select_admissao_tenant"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'documentos'
        AND EXISTS (
          SELECT 1
            FROM public.admissoes a
           WHERE a.id = public.storage_path_admissao_id(storage.objects.name)
             AND public.user_belongs_to_empresa(auth.uid(), a.empresa_id)
        )
      );
  END IF;
END $$;
