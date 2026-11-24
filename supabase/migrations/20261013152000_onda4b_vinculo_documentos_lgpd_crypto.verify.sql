-- W80 — verify.sql da migration 20261013152000_onda4b_vinculo_documentos_lgpd_crypto
-- Confere, no canônico, que a criptografia de dados bancários (P1-025) está
-- de fato instalada e funcionando: colunas, funções, triggers, view e chave
-- do Vault configurada. O run 38428460909 falhou aqui por "chave do Vault
-- ausente" (vault.create_secret com assinatura errada); foi corrigido nesta
-- mesma migration (4º argumento new_key_id) e reaplicado na mesma onda.
--
-- Contrato W69 (canonical-migrations.yml): executado via
-- `psql ... -t -A -f <sidecar>`; cada linha não-vazia da saída deve ser
-- literalmente 'ok'. Qualquer outro valor (ou erro de execução) é tratado
-- como falha do sidecar e reprova o apply.

-- 1. Colunas *_encrypted existem com o tipo esperado (text — a migration usa
--    pgp_sym_encrypt(...)::text, não bytea).
SELECT CASE WHEN (
  SELECT count(*) FROM information_schema.columns
   WHERE table_schema = 'public'
     AND (table_name, column_name) IN (
       ('contas_bancarias','agencia_encrypted'),
       ('contas_bancarias','conta_encrypted'),
       ('contas_bancarias','digito_encrypted'),
       ('contas_bancarias','pix_chave_encrypted'),
       ('pix_itens','chave_pix_encrypted')
     )
     AND data_type = 'text'
) = 5 THEN 'ok' ELSE 'fail: colunas *_encrypted ausentes ou com tipo inesperado' END;

-- 2. Funções de criptografia/decriptografia existem.
SELECT CASE WHEN to_regprocedure('public.encrypt_dados_bancarios(text)') IS NOT NULL
             AND to_regprocedure('public.decrypt_dados_bancarios(text)') IS NOT NULL
            THEN 'ok' ELSE 'fail: encrypt_dados_bancarios/decrypt_dados_bancarios ausentes' END;

-- 2b. ACLs das funções: anon/authenticated NÃO podem executar decrypt_dados_bancarios
--     (SECURITY DEFINER — exporia dados bancários a qualquer usuário autenticado);
--     service_role DEVE poder executar (consumers internos legítimos).
--     Conforme revokes/grants explícitos da migration (PR #242, Codex review).
SELECT CASE WHEN NOT has_function_privilege('anon',         'public.decrypt_dados_bancarios(text)', 'EXECUTE')
             AND NOT has_function_privilege('authenticated', 'public.decrypt_dados_bancarios(text)', 'EXECUTE')
             AND     has_function_privilege('service_role',  'public.decrypt_dados_bancarios(text)', 'EXECUTE')
            THEN 'ok' ELSE 'fail: ACLs de decrypt_dados_bancarios incorretas (anon/authenticated não devem ter EXECUTE; service_role deve ter)' END;

-- 3. Triggers de criptografia automática existem, estão habilitados para
--    sessões normais de aplicação (tgenabled IN (''O'',''A'') — ''R'' significa
--    REPLICA e não dispara em escrita normal), vinculados à tabela E função
--    certas no schema public, e configurados como BEFORE FOR EACH ROW em
--    INSERT OR UPDATE (tgtype = 23 = ROW|BEFORE|INSERT|UPDATE). Codex reviews
--    PR #242 e followup (PR #243):
--    - tgname não é único no catálogo (escopado por relação) → join em
--      pg_class/pg_namespace.
--    - p.pronamespace não estava restrito → função homônima em outro schema
--      passaria. Adicionado join em np (namespace da função).
--    - tgenabled <> ''D'' também aceitava ''R'' (trigger replica-only, inativo
--      em sessões normais) → narrowed para IN (''O'',''A'').
--    - tgtype adicionado para garantir que é BEFORE/ROW/INSERT/UPDATE (23).
SELECT CASE WHEN (
  SELECT count(*) FROM pg_trigger t
  JOIN pg_class c  ON c.oid  = t.tgrelid
  JOIN pg_namespace n  ON n.oid  = c.relnamespace
  JOIN pg_proc p   ON p.oid  = t.tgfoid
  JOIN pg_namespace np ON np.oid = p.pronamespace
   WHERE NOT t.tgisinternal
     AND t.tgenabled IN ('O', 'A')
     AND t.tgtype = 23
     AND (n.nspname, c.relname, t.tgname, np.nspname, p.proname) IN (
       ('public','contas_bancarias','trg_contas_bancarias_encrypt','public','encrypt_contas_bancarias_fields'),
       ('public','pix_itens','trg_pix_itens_encrypt','public','encrypt_pix_itens_fields')
     )
) = 2 THEN 'ok' ELSE 'fail: trigger(s) de criptografia ausente(s), desabilitado(s), em modo replica, com tgtype errado ou vinculado(s) à tabela/schema/função errada' END;

-- 4. View de leitura descriptografada (contas_bancarias_decrypted) existe E é
--    uma view (relkind = ''v'') — to_regclass retorna não-NULL para qualquer
--    tipo de relação, inclusive tabelas ou materialized views, então checar
--    só IS NOT NULL não é suficiente (Codex review, PR #242-followup).
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'contas_bancarias_decrypted'
    AND c.relkind = 'v'
) THEN 'ok' ELSE 'fail: contas_bancarias_decrypted ausente ou não é uma view (relkind ≠ v)' END;

-- 5. Backfill completo E correto: toda linha com dado bancário em claro tem
--    a cópia cifrada correspondente (nenhuma linha esquecida pelo backfill)
--    E essa cópia decripta de volta para o valor em claro armazenado —
--    checar só "não é NULL" (Codex review, PR #242) deixava passar um
--    ciphertext corrompido ou cifrado com outra chave, já que o round-trip
--    do check 6 só testa um valor novo com a chave atual, nunca as linhas
--    de verdade. decrypt_dados_bancarios não grava em tabela — leitura pura.
SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM public.contas_bancarias
   WHERE (agencia IS NOT NULL AND agencia_encrypted IS NULL)
      OR (conta IS NOT NULL AND conta_encrypted IS NULL)
      OR (digito IS NOT NULL AND digito_encrypted IS NULL)
      OR (pix_chave IS NOT NULL AND pix_chave_encrypted IS NULL)
      OR (agencia IS NOT NULL AND public.decrypt_dados_bancarios(agencia_encrypted) IS DISTINCT FROM agencia)
      OR (conta IS NOT NULL AND public.decrypt_dados_bancarios(conta_encrypted) IS DISTINCT FROM conta)
      OR (digito IS NOT NULL AND public.decrypt_dados_bancarios(digito_encrypted) IS DISTINCT FROM digito)
      OR (pix_chave IS NOT NULL AND public.decrypt_dados_bancarios(pix_chave_encrypted) IS DISTINCT FROM pix_chave)
) AND NOT EXISTS (
  SELECT 1 FROM public.pix_itens
   WHERE (chave_pix IS NOT NULL AND chave_pix_encrypted IS NULL)
      OR (chave_pix IS NOT NULL AND public.decrypt_dados_bancarios(chave_pix_encrypted) IS DISTINCT FROM chave_pix)
) THEN 'ok' ELSE 'fail: backfill incompleto ou ciphertext existente não decripta para o valor em claro armazenado' END;

-- 6. Chave do Vault configurada e round-trip completo operante (causa raiz
--    do run 38428460909): a função lança EXCEPTION quando a chave não está
--    configurada (ver migration). Testa encrypt+decrypt juntos (Codex
--    review, PR #242) — testar só o encrypt provava a chave mas não que
--    decrypt_dados_bancarios de fato devolve o valor original (cast, corpo
--    ou lookup de chave quebrados no decrypt passariam batido). Sem efeito
--    colateral: nenhuma das duas funções grava em tabela.
SELECT CASE WHEN public.decrypt_dados_bancarios(public.encrypt_dados_bancarios('w80_verify_probe')) = 'w80_verify_probe'
            THEN 'ok' ELSE 'fail: decrypt_dados_bancarios(encrypt_dados_bancarios(...)) não devolveu o valor original (chave do Vault ausente/incorreta?)' END;
