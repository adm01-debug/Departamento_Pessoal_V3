-- idx_rate_limit_logs_expires depende de rate_limit_logs.expires_at, coluna ausente no
-- banco canonico. A migration 20260719170000 cria os tres indices dentro de um bloco com
-- EXCEPTION WHEN others THEN NULL, entao sem a coluna o indice nunca nasce. A assercao
-- acompanha a mesma condicao: cobra o indice apenas quando ele e aplicavel.
SELECT CASE
  WHEN to_regclass('public.idx_audit_log_tabela_acao_created') IS NULL
    OR to_regclass('public.idx_login_attempts_email_created') IS NULL
    THEN 'FALHOU: indice de seguranca ausente'
  WHEN EXISTS (
         SELECT 1
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'rate_limit_logs'
            AND column_name = 'expires_at'
       )
       AND to_regclass('public.idx_rate_limit_logs_expires') IS NULL
    THEN 'FALHOU: indice de seguranca ausente'
  ELSE 'ok'
END;
