-- Placeholder de reconciliacao de ledger (runbook: infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md, Gate D).
-- A versao 20260723122702 existe no ledger canonico sem arquivo local. As 316 versoes nesse estado
-- foram gravadas num unico INSERT em massa em 2026-09-11 11:55:47Z, com name e
-- statements nulos, e nao existem em nenhum commit do historico Git -- nao ha DDL a
-- recuperar. Este no-op da a versao remota uma fonte local para o Supabase Preview nao
-- reprovar com "Remote migration versions not found in local migrations directory".
DO $$ BEGIN RAISE NOTICE 'migration 20260723122702: placeholder no-op (versao remota sem fonte local)'; END $$;
