-- Sidecar de verificacao da 20261126140000.
-- Roda no fim da transacao do apply/verify, com o mesmo role admin.
SELECT CASE
  WHEN NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'documentos_admissao'
       AND a.attname = 'substituido_em'
       AND a.atttypid = 'timestamptz'::regtype
       AND NOT a.attisdropped
  ) THEN 'FALHOU: coluna documentos_admissao.substituido_em ausente'
  WHEN NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'documentos_admissao_marcar_anteriores'
       AND p.prosecdef
  ) THEN 'FALHOU: funcao documentos_admissao_marcar_anteriores ausente ou sem SECURITY DEFINER'
  WHEN NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'documentos_admissao'
       AND t.tgname = 'trg_documentos_admissao_marcar_anteriores'
       AND NOT t.tgisinternal
       -- tgenabled = 'O' descarta trigger desabilitado; tgfoid garante que ele
       -- chama a funcao desta migration e nao outra de mesmo nome logico.
       AND t.tgenabled = 'O'
       AND t.tgfoid = 'public.documentos_admissao_marcar_anteriores()'::regprocedure
  ) THEN 'FALHOU: trigger trg_documentos_admissao_marcar_anteriores ausente, desabilitado ou ligado a outra funcao'
  WHEN NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'documentos_admissao'
       AND indexname = 'idx_documentos_admissao_vigentes'
  ) THEN 'FALHOU: indice parcial idx_documentos_admissao_vigentes ausente'
  ELSE 'ok'
END;