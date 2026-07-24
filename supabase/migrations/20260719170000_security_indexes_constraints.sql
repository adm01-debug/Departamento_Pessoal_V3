-- Security hardening: indexes for audit queries and constraints for data integrity.

-- Indexes wrapped to survive missing tables/columns on preview branches
DO $$
DECLARE
  r TEXT;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'CREATE INDEX IF NOT EXISTS idx_audit_log_tabela_acao_created ON public.audit_log (tabela, acao, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON public.login_attempts (email, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_expires ON public.rate_limit_logs (expires_at) WHERE expires_at IS NOT NULL'
  ]) LOOP
    BEGIN
      EXECUTE r;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;

-- Add NOT NULL constraint on empresa_id for critical business tables
-- (only if not already set; these prevent orphaned records without tenant context)
DO $$
BEGIN
  -- colaboradores.empresa_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'colaboradores' AND column_name = 'empresa_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE colaboradores ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- folhas_pagamento.empresa_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'folhas_pagamento' AND column_name = 'empresa_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE folhas_pagamento ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- despesas.empresa_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'despesas' AND column_name = 'empresa_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE despesas ALTER COLUMN empresa_id SET NOT NULL;
  END IF;
END
$$;

-- Prevent future inserts with empty string empresa_id
CREATE OR REPLACE FUNCTION prevent_empty_empresa_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.empresa_id IS NOT NULL AND NEW.empresa_id = '' THEN
    RAISE EXCEPTION 'empresa_id cannot be an empty string';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to key tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['colaboradores', 'folhas_pagamento', 'despesas', 'batidas_ponto', 'registros_ponto', 'admissoes'])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_prevent_empty_empresa_%I ON %I; CREATE TRIGGER trg_prevent_empty_empresa_%I BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION prevent_empty_empresa_id();',
      t, t, t, t
    );
  END LOOP;
END
$$;
