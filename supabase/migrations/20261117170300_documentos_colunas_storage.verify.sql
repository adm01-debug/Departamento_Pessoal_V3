-- Sidecar de 20261117170300. Somente leitura: catalogo do Postgres.

-- 1. As 4 colunas existem em `documentos`, com os tipos declarados.
--    atttypid::regtype em vez de format_type: nome estavel independente de search_path.
SELECT CASE WHEN (
  SELECT count(*) FROM pg_attribute a
   WHERE a.attrelid = 'public.documentos'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
     AND ((a.attname = 'storage_path' AND a.atttypid = 'text'::regtype)
       OR (a.attname = 'mime_type'    AND a.atttypid = 'text'::regtype)
       OR (a.attname = 'nome_arquivo' AND a.atttypid = 'text'::regtype)
       OR (a.attname = 'tamanho'      AND a.atttypid = 'bigint'::regtype))
) = 4 THEN 'ok' ELSE 'FALHOU' END;

-- 2. As 2 colunas existem em `documentos_pessoais_arquivos`.
SELECT CASE WHEN (
  SELECT count(*) FROM pg_attribute a
   WHERE a.attrelid = 'public.documentos_pessoais_arquivos'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
     AND a.attname IN ('storage_path', 'mime_type')
     AND a.atttypid = 'text'::regtype
) = 2 THEN 'ok' ELSE 'FALHOU' END;

-- 3. ADITIVO de verdade: todas as 6 sao anulaveis e sem default. Se alguma
--    tivesse NOT NULL ou default, a migration teria tocado linha existente.
SELECT CASE WHEN (
  SELECT bool_and(NOT a.attnotnull AND NOT a.atthasdef)
    FROM pg_attribute a
   WHERE ((a.attrelid = 'public.documentos'::regclass
           AND a.attname IN ('storage_path','mime_type','nome_arquivo','tamanho'))
       OR (a.attrelid = 'public.documentos_pessoais_arquivos'::regclass
           AND a.attname IN ('storage_path','mime_type')))
     AND a.attnum > 0 AND NOT a.attisdropped
) THEN 'ok' ELSE 'FALHOU' END;

-- 4. `url`, a coluna que o sistema usa hoje, continua existindo: esta migration
--    acrescenta caminho novo, nao substitui o antigo.
SELECT CASE WHEN (
  SELECT count(*) = 1 FROM pg_attribute a
   WHERE a.attrelid = 'public.documentos'::regclass
     AND a.attname = 'url' AND a.attnum > 0 AND NOT a.attisdropped
) THEN 'ok' ELSE 'FALHOU' END;

-- 5. GUARDA: os buckets NAO foram alterados por esta migration — nenhuma
--    restricao de mime type entrou (ver o cabecalho do .sql).
SELECT CASE WHEN (
  SELECT bool_and(allowed_mime_types IS NULL)
    FROM storage.buckets WHERE id IN ('documentos', 'documentos-colaboradores')
) THEN 'ok' ELSE 'FALHOU' END;
