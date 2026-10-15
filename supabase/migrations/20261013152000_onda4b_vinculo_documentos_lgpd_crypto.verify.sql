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

-- 3. Triggers de criptografia automática existem, estão habilitados
--    (tgenabled = 'D' é o único estado "desabilitado") e vinculados à
--    tabela E função certas — tgname não é único no catálogo (é escopado
--    por relação), então um trigger homônimo em outra tabela, ou ligado
--    à função errada, não pode passar por esta checagem (Codex review,
--    PR #242).
SELECT CASE WHEN (
  SELECT count(*) FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
   WHERE NOT t.tgisinternal
     AND t.tgenabled <> 'D'
     AND (n.nspname, c.relname, t.tgname, p.proname) IN (
       ('public','contas_bancarias','trg_contas_bancarias_encrypt','encrypt_contas_bancarias_fields'),
       ('public','pix_itens','trg_pix_itens_encrypt','encrypt_pix_itens_fields')
     )
) = 2 THEN 'ok' ELSE 'fail: trigger(s) de criptografia ausente(s), desabilitado(s) ou vinculado(s) à tabela/função errada' END;

-- 4. View de leitura descriptografada (contas_bancarias_decrypted) existe.
SELECT CASE WHEN to_regclass('public.contas_bancarias_decrypted') IS NOT NULL
            THEN 'ok' ELSE 'fail: view contas_bancarias_decrypted ausente' END;

-- 5. Backfill completo: toda linha com dado bancário em claro tem a cópia
--    cifrada correspondente (nenhuma linha esquecida pelo backfill).
SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM public.contas_bancarias
   WHERE (agencia IS NOT NULL AND agencia_encrypted IS NULL)
      OR (conta IS NOT NULL AND conta_encrypted IS NULL)
      OR (digito IS NOT NULL AND digito_encrypted IS NULL)
      OR (pix_chave IS NOT NULL AND pix_chave_encrypted IS NULL)
) AND NOT EXISTS (
  SELECT 1 FROM public.pix_itens
   WHERE chave_pix IS NOT NULL AND chave_pix_encrypted IS NULL
) THEN 'ok' ELSE 'fail: backfill incompleto — linha com dado em claro sem cópia cifrada' END;

-- 6. Chave do Vault configurada e round-trip completo operante (causa raiz
--    do run 38428460909): a função lança EXCEPTION quando a chave não está
--    configurada (ver migration). Testa encrypt+decrypt juntos (Codex
--    review, PR #242) — testar só o encrypt provava a chave mas não que
--    decrypt_dados_bancarios de fato devolve o valor original (cast, corpo
--    ou lookup de chave quebrados no decrypt passariam batido). Sem efeito
--    colateral: nenhuma das duas funções grava em tabela.
SELECT CASE WHEN public.decrypt_dados_bancarios(public.encrypt_dados_bancarios('w80_verify_probe')) = 'w80_verify_probe'
            THEN 'ok' ELSE 'fail: decrypt_dados_bancarios(encrypt_dados_bancarios(...)) não devolveu o valor original (chave do Vault ausente/incorreta?)' END;
