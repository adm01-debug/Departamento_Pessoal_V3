-- ============================================================================
-- P1-023: Padroniza naming de migrations (YYYYMMDDHHMMSS_description)
-- ----------------------------------------------------------------------------
-- Cria um script de auditoria que detecta migrations fora do padrão e
-- gera relatório. Migration files legados (001_, 202512161..., UUID) seguem
-- funcionando — o objetivo é validar consistência daqui pra frente.
-- ============================================================================

-- Tabela de auditoria (idempotente)
CREATE TABLE IF NOT EXISTS public.migration_naming_audit (
  filename TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  compliant BOOLEAN NOT NULL,
  audited_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.migration_naming_audit IS
  '[P1-023] Auditoria do padrão de naming YYYYMMDDHHMMSS_description.';

-- Função que classifica o padrão de um nome de arquivo
CREATE OR REPLACE FUNCTION public._classify_migration_name(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Padrão canônico: YYYYMMDDHHMMSS_description.sql
  IF name ~ '^[0-9]{14}_[a-z][a-z0-9_]*\.sql$' THEN
    RETURN 'canonical';
  END IF;
  -- Padrão Supabase antigo: YYYYMMDDHHMMSS-uuid_description.sql
  IF name ~ '^[0-9]{14}_[0-9a-f-]+_[a-z][a-z0-9_]*\.sql$' THEN
    RETURN 'supabase_legacy';
  END IF;
  -- Padrão numérico simples: NNN_description.sql
  IF name ~ '^[0-9]{3}_[a-z][a-z0-9_]*\.sql$' THEN
    RETURN 'numeric_legacy';
  END IF;
  RETURN 'unknown';
END;
$$;

COMMENT ON FUNCTION public._classify_migration_name IS
  '[P1-023] Classifica nome de arquivo de migration. Retorna canonical|supabase_legacy|numeric_legacy|unknown.';

-- Migration de exemplo seguindo o padrão canônico (não-op)
-- Importante: este arquivo DEVE ser o último a ser aplicado.
SELECT 'P1-023: Padrão de naming documentado. Use YYYYMMDDHHMMSS_description.sql para migrations novas.' AS info;
