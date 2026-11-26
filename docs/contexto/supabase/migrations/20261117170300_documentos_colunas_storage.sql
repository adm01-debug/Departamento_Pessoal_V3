-- =============================================================================
-- Resgate PARCIAL da branch `muri` (20260925120000_document_upload_storage_columns),
-- redatado. Autorizado pelo dono na issue #628.
--
-- PROBLEMA, verificado em producao: `public.documentos` tem
--   id, colaborador_id, nome, tipo, url, validado, validado_por,
--   data_validade, observacoes, created_at, updated_at, empresa_id
-- e NENHUMA coluna de storage. Mas `src/services/documentoService.ts:9` ja
-- declara `storage_path?: string | null` no tipo, e
-- `PortalDocumentosTab.tsx:124` ja le `doc.storage_path` para montar o caminho
-- do arquivo a remover. Como a coluna nao existe, o `select('*')` nunca a
-- traz: o valor e sempre `undefined` e o codigo cai no fallback.
--
-- E o caso classico de trabalho pela metade — o tipo e o consumidor entraram
-- na `main`, o DDL ficou na `muri`.
--
-- Puramente ADITIVO: ADD COLUMN IF NOT EXISTS, todas anulaveis, sem default e
-- sem backfill. Nenhuma linha existente muda, nenhum SELECT atual quebra.
--
-- DO ARQUIVO ORIGINAL, NAO TRAGO as duas alteracoes de `storage.buckets`
-- (`file_size_limit` e `allowed_mime_types`): nao estavam no que o dono
-- aprovou, e `allowed_mime_types` RESTRINGE upload. Procurei no codigo e nao
-- existe upload no bucket `documentos` hoje (so o `.remove()` do portal), ou
-- seja eu nao consigo provar quais tipos estao em uso — restringir as cegas
-- poderia quebrar um caminho de upload que eu nao encontrei. Fica registrado
-- na issue #628 como pergunta separada.
-- =============================================================================

ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS storage_path  TEXT,
  ADD COLUMN IF NOT EXISTS mime_type     TEXT,
  ADD COLUMN IF NOT EXISTS nome_arquivo  TEXT,
  ADD COLUMN IF NOT EXISTS tamanho       BIGINT;

ALTER TABLE public.documentos_pessoais_arquivos
  ADD COLUMN IF NOT EXISTS storage_path  TEXT,
  ADD COLUMN IF NOT EXISTS mime_type     TEXT;

COMMENT ON COLUMN public.documentos.storage_path IS
  'Caminho do objeto no bucket `documentos`, padrao {empresa_id}/{colaborador_id}/{categoria}/{uuid}.{ext}. Lido por PortalDocumentosTab para remover o arquivo junto com a linha.';
