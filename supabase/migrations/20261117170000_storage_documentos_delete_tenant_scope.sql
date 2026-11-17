-- =============================================================================
-- Resgate da branch `muri` (20260925130000), redatado para aplicar DEPOIS do
-- ultimo item do ledger (20261116120000). Autorizado pelo dono na issue #628.
--
-- PROBLEMA REAL, verificado em producao antes de escrever:
-- `storage.objects` nao tem NENHUMA policy de DELETE para os buckets
-- `documentos` e `documentos-colaboradores` (pg_policies, cmd='DELETE': so
-- existem para comprovantes-despesas, contabilidade-anexos e training-images).
-- Com RLS ligada e nenhuma policy permissiva, o DELETE e negado.
--
-- Efeito no sistema hoje: `PortalDocumentosTab.tsx:125` chama
-- `supabase.storage.from('documentos').remove([path])` e NAO checa o erro;
-- em seguida `documentoService.excluir` apaga a linha do banco. O usuario ve
-- "Documento removido", a linha desaparece da tela e o ARQUIVO FICA no
-- storage para sempre — PII orfa, sem nenhuma referencia no banco.
--
-- DIFERENCA PROPOSITAL EM RELACAO AO ARQUIVO DA `muri`:
-- a versao original usava `((storage.foldername(name))[1])::uuid`, que LEVANTA
-- `invalid input syntax for type uuid` em qualquer objeto cujo 1o segmento de
-- path nao seja um uuid — dentro de uma policy isso estoura a query. Aqui uso
-- `public.storage_path_empresa_id(name)`, o helper que a propria `main` ja usa
-- nas policies dos outros 3 buckets: valida o formato por regex e devolve NULL
-- quando o path e malformado. Como `pode_gerir_rh` exige `_empresa_id IS NOT
-- NULL`, path malformado resulta em FALSE — fail-closed.
--
-- A PERMISSAO e a mesma que a `muri` pretendia e nao amplia nada:
-- `pode_gerir_rh(empresa_id)` = is_admin OR (pertence a user_empresas daquela
-- empresa AND tem role 'rh'). Deliberadamente NAO usei
-- `user_can_manage_tenant_storage`, que inclui 'gestor' e ampliaria quem apaga
-- documento.
-- =============================================================================

-- audit-migration-style: allow-silent-drop verificado em producao que a policy NAO existe (pg_policies, schemaname=storage, tablename=objects, cmd=DELETE: zero linhas para este nome) — um gate fail-closed exigindo que ela exista reprovaria por definicao; o DROP esta aqui so para tornar a migration reaplicavel, e o CREATE abaixo deixa o estado final
DROP POLICY IF EXISTS "documentos_delete_rh_admin" ON storage.objects;
CREATE POLICY "documentos_delete_rh_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND public.pode_gerir_rh(public.storage_path_empresa_id(name))
  );

-- audit-migration-style: allow-silent-drop mesmo caso da policy acima — conferido que nao existe em producao; DROP apenas para reaplicabilidade, CREATE abaixo fixa o estado final
DROP POLICY IF EXISTS "docs_colab_delete_rh_admin" ON storage.objects;
CREATE POLICY "docs_colab_delete_rh_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos-colaboradores'
    AND public.pode_gerir_rh(public.storage_path_empresa_id(name))
  );
