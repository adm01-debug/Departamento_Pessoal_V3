-- =============================================================================
-- storage: remove as policies de `documentos-admissao`.
--
-- A 20261126090000 criou duas policies nesse bucket a partir de uma leitura
-- errada de quem o consome. O unico ponto do codigo que toca
-- `documentos-admissao` e o `useDocumentOCR.ts`, e ele roda no portal publico
-- /contratacao, sem sessao. Policy `TO authenticated` nao alcanca `anon`, entao
-- ela nunca destravou nada -- o upload era negado por RLS.
--
-- O caminho real do documento do candidato e a edge function `admissao-publica`
-- (service_role, bucket `documentos`, depois de validar o token), que tambem
-- roda o OCR. Sem consumidor, `documentos-admissao` volta a ficar sem policy,
-- como a 20261117193000 registrou de proposito: o documento chega antes de o
-- candidato ter vinculo de empresa, entao nao ha `empresa_id` para exigir no
-- caminho.
--
-- Sem policy e com RLS ligada, o bucket fica deny-by-default para
-- `authenticated` e para `anon` -- que e o estado que a 20261117193000 fixou
-- como decisao, e que o sidecar daquela migration passa a poder afirmar.
--
-- Idempotente (DROP POLICY IF EXISTS) e reversivel: recriar as policies em
-- storage.objects basta.
-- =============================================================================

-- Guarda fail-closed: se uma das policies ja nao existir, o DROP silencioso
-- esconderia divergencia entre o repositorio e o canonico.
DO $$
DECLARE
  faltando text;
BEGIN
  SELECT string_agg(esperada.nome, ', ')
    INTO faltando
    FROM (VALUES ('pol_admissao_docs_insert_tenant_ou_temp'),
                 ('pol_admissao_docs_select_tenant_ou_temp')) AS esperada(nome)
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_catalog.pg_policies
      WHERE pg_catalog.pg_policies.schemaname = 'storage'
        AND pg_catalog.pg_policies.tablename = 'objects'
        AND pg_catalog.pg_policies.policyname = esperada.nome
   );

  IF faltando IS NOT NULL THEN
    RAISE EXCEPTION 'policy ausente no canonico em documentos-admissao: % (as duas esperadas: "pol_admissao_docs_insert_tenant_ou_temp", "pol_admissao_docs_select_tenant_ou_temp") -- repositorio e banco divergiram',
      faltando;
  END IF;
END $$;

DROP POLICY IF EXISTS "pol_admissao_docs_insert_tenant_ou_temp" ON storage.objects;
DROP POLICY IF EXISTS "pol_admissao_docs_select_tenant_ou_temp" ON storage.objects;