-- Placeholder de reconciliação de ledger (runbook: infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md, Gate D).
-- A versão 20260723000028 consta como aplicada no ledger remoto (frjbfeamybqsejlvmqbl), mas
-- o arquivo-fonte nunca existiu neste repositório — migration aplicada manualmente
-- ou via ambiente divergente antes do alinhamento do pipeline. O conteúdo real
-- dessa versão já foi reconciliado fisicamente no schema canônico; este arquivo é
-- intencionalmente um no-op para que a versão remota tenha fonte local e o check
-- "remote versions found locally" do Supabase passe.
DO $$ BEGIN RAISE NOTICE 'migration 20260723000028: placeholder no-op (versão remota sem fonte local)'; END $$;
