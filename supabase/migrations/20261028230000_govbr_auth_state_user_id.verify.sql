-- Sidecar da 20261028230000_govbr_auth_state_user_id.
-- Contrato: toda linha nao-vazia da saida tem de ser exatamente 'ok'.
-- Somente leitura de catalogo (roda em sessao default_transaction_read_only).
--
-- Escrito nesta auditoria: a migration esta na `main` desde 28/10/2026 e NUNCA
-- entrou no ledger do canonico. Medido em 18/11/2026 com
-- supabase_db_list_columns: public.govbr_auth_state tem 6 colunas (id, state,
-- nonce, redirect_uri, created_at, expires_at) e NAO tem user_id. A edge
-- auth-gov-br insere essa coluna em supabase/functions/auth-gov-br/index.ts:130
-- e faz `throw stateErr` na 133, logo todo pedido de URL de autenticacao
-- gov.br falha em producao. Sem sidecar o lote nao pode entrar no
-- canonical-migrations.yml.

-- 1) a coluna existe, e uuid e NULLABLE. O nullable e regra de negocio, nao
--    detalhe: state anonimo (botao "Entrar com gov.br" na tela de login, sem
--    sessao) grava user_id NULL; state de vinculacao grava o uuid do usuario
--    logado. Um NOT NULL aqui quebraria justamente o fluxo de login.
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = 'public.govbr_auth_state'::regclass
      AND a.attname = 'user_id'
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.atttypid = 'uuid'::regtype
      AND NOT a.attnotnull
  ) THEN 'ok' ELSE 'FALHOU: public.govbr_auth_state.user_id ausente, nao-uuid ou NOT NULL' END;

-- 2) a FK aponta para auth.users e tem ON DELETE CASCADE (confdeltype 'c').
--    Sem cascade, apagar um usuario deixaria state orfao apontando para
--    auth.users inexistente, e a limpeza de conta falharia por violacao de FK.
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.govbr_auth_state'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'auth.users'::regclass
      AND c.confdeltype = 'c'
      AND (SELECT string_agg(a.attname, ',' ORDER BY k.ord)
             FROM unnest(c.conkey::int[]) WITH ORDINALITY AS k(attnum, ord)
             JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
          ) = 'user_id'
  ) THEN 'ok' ELSE 'FALHOU: FK de govbr_auth_state.user_id para auth.users com ON DELETE CASCADE ausente' END;

-- 3) o indice de leitura existe, e VALIDO e a chave e EXATAMENTE (user_id).
--    Indice invalido nao serve a consulta; chave diferente nao cobre o lookup
--    por usuario que a vinculacao de conta faz.
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    WHERE ic.relname = 'idx_govbr_auth_state_user_id'
      AND i.indrelid = 'public.govbr_auth_state'::regclass
      AND i.indisvalid
      AND (SELECT string_agg(a.attname, ',' ORDER BY k.ord)
             FROM unnest(i.indkey::int[]) WITH ORDINALITY AS k(attnum, ord)
             JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
          ) = 'user_id'
  ) THEN 'ok' ELSE 'FALHOU: idx_govbr_auth_state_user_id ausente, invalido ou com chave diferente de (user_id)' END;

-- 4) a RLS da tabela nao foi afrouxada pela migration. Ela e aditiva (ADD
--    COLUMN + CREATE INDEX) e nao deve mexer em policy nenhuma: se o numero de
--    policies mudar, alguem mexeu junto e isso precisa ser revisto a mao.
SELECT CASE WHEN (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE n.nspname = 'public' AND c.relname = 'govbr_auth_state')
  THEN 'ok' ELSE 'FALHOU: RLS desligada em public.govbr_auth_state' END;

-- A assercao de ledger NAO mora aqui: o `validate` roda em transacao que
-- termina em ROLLBACK e o ledger so e escrito no `apply`, entao um sidecar que
-- exigisse a versao registrada nunca passaria em validate. A prova de ledger
-- esta em scripts/canonical-invariants.sql, no modo `verify`.
