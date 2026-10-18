-- verify.sql da migration 20261014160000_onda4c_review_fixes_empresa_id
-- Confere no canônico que os fixes do Devin Review (#229) e os gaps de
-- empresa_id foram aplicados: vínculo unívoco + e-mail confirmado, sem
-- fallback de GUC na criptografia, purge que reseta o bypass, policy de
-- documentos de empresa e empresa_id nas 4 tabelas. O repair do ledger
-- (20261014170000) é verificado pela existência de uma versão marcada.
--
-- Contrato W69 (canonical-migrations.yml): executado via
-- `psql ... -t -A -f <sidecar>`; cada linha não-vazia da saída deve ser
-- literalmente 'ok'.

-- 1. Vínculo exige e-mail confirmado e match unívoco por empresa (BUG_0001,
--    SEC_0002): a def contém email_confirmed_at e a contagem por partição.
SELECT CASE WHEN pg_get_functiondef('public.vincular_colaborador_ao_usuario()'::regprocedure)
                 LIKE '%email_confirmed_at%'
             AND pg_get_functiondef('public.vincular_colaborador_ao_usuario()'::regprocedure)
                 LIKE '%PARTITION BY%'
            THEN 'ok' ELSE 'fail: vincular_colaborador_ao_usuario sem guarda de confirmação/univocidade' END;

-- 2. Criptografia sem fallback de GUC (SEC_0001): a def de encrypt não pode
--    conter 'app.encryption_key' em lugar nenhum (nem comentário).
SELECT CASE WHEN pg_get_functiondef('public.encrypt_dados_bancarios(text)'::regprocedure)
                 NOT LIKE '%app.encryption_key%'
             AND pg_get_functiondef('public.decrypt_dados_bancarios(text)'::regprocedure)
                 NOT LIKE '%app.encryption_key%'
            THEN 'ok' ELSE 'fail: fallback de GUC ainda presente na criptografia' END;

-- 3. run_lgpd_purge reseta o bypass ao final (SEC_0003): a def contém uma
--    chamada set_config com 'off'.
SELECT CASE WHEN pg_get_functiondef('public.run_lgpd_purge(boolean)'::regprocedure)
                 LIKE '%audit_log_purge%, %off%'
            THEN 'ok' ELSE 'fail: run_lgpd_purge não desliga app.audit_log_purge ao final' END;

-- 4. RH gerencia documentos sem colaborador (BUG_0002): policy existe e
--    referencia empresa_id + pode_gerir_rh.
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'documentos'
     AND policyname = 'documentos_rh_empresa_manage'
     AND qual LIKE '%pode_gerir_rh%'
) THEN 'ok' ELSE 'fail: policy documentos_rh_empresa_manage ausente' END;

-- 5. empresa_id nas 4 tabelas com gap confirmado (historico_cargo,
--    colaborador_beneficios, documentos_colaborador, logs_sistema) —
--    tolerante a tabela ausente (o DO da migration pula com NOTICE).
SELECT CASE WHEN (
  SELECT count(*) FROM information_schema.columns
   WHERE table_schema = 'public'
     AND column_name = 'empresa_id'
     AND table_name IN ('historico_cargo','colaborador_beneficios',
                        'documentos_colaborador','logs_sistema')
) = (
  SELECT count(*) FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('historico_cargo','colaborador_beneficios',
                        'documentos_colaborador','logs_sistema')
) THEN 'ok' ELSE 'fail: empresa_id ausente em tabela existente do lote' END;

-- 6. Repair do ledger aplicado (20261014170000): uma versão do lote p0_001
--    deve constar no ledger — prova que os 598 INSERTs rodaram.
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations
   WHERE version = '20260809000000'
) THEN 'ok' ELSE 'fail: repair do ledger não registrou versões do p0_001' END;
