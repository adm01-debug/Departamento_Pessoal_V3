-- Adiciona as colunas de metadado de arquivo que faltam para suportar upload
-- real (Storage) nos formulários de documento do colaborador, preservando
-- 100% de compatibilidade com registros antigos que só têm `url`/`arquivo_url`.
--
-- `documentos.storage_path`/`mime_type`/`nome_arquivo`/`tamanho`: nomes
-- escolhidos para bater exatamente com o payload que
-- src/pages/DocumentosPage.tsx:117-125 já tenta inserir hoje (e que falha em
-- runtime porque essas colunas nunca existiram — esta migration corrige esse
-- bug latente de quebra, além de habilitar o novo fluxo de upload nos cards
-- de "Documentos & Compliance" do dossiê do colaborador).
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS nome_arquivo TEXT,
  ADD COLUMN IF NOT EXISTS tamanho BIGINT;

-- `documentos_pessoais_arquivos` já tinha `arquivo_nome`/`arquivo_tamanho`
-- (nunca populados, pois o form só coletava `arquivo_url` manual) — só falta
-- `storage_path` e `mime_type`.
ALTER TABLE public.documentos_pessoais_arquivos
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Buckets de destino já existem e já são privados — nenhum bucket novo
-- criado. 'documentos' é o bucket já usado por DocumentosPage.tsx/
-- PortalDocumentosTab.tsx (mesma tabela `documentos`); 'documentos-colaboradores'
-- foi criado em 20251220131149 com o propósito certo (employee documents) mas
-- nunca chegou a ser referenciado em código algum — reaproveitado aqui para
-- `documentos_pessoais_arquivos`. Alinhamos os dois ao mesmo limite/whitelist
-- (10MB; pdf/jpg/png/webp/doc/docx/xls/xlsx/csv — sem executáveis).
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]
WHERE id IN ('documentos', 'documentos-colaboradores');
