-- Placeholder de reconciliação de ledger (runbook: infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md, Gate D).
-- A versão 20260724130002 pode constar no ledger do projeto de preview (gravada por um push
-- parcial anterior, quando p3_065/p3_065b usavam temporariamente esta versão).
-- O conteúdo real já é aplicado pelas versões canônicas 20260724130000/30001;
-- este arquivo é um no-op para manter a versão remota com fonte local.
DO $$ BEGIN RAISE NOTICE 'migration 20260724130002: placeholder no-op (versão remota sem fonte local)'; END $$;
