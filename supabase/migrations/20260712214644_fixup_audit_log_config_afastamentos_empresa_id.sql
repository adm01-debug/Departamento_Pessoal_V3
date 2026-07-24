-- Fixup: add empresa_id to audit_log and config_afastamentos
-- Required before 20260719120000 (RLS batch2 policies reference empresa_id directly)

-- audit_log: add empresa_id (nullable; backfill not possible without source data)
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

-- config_afastamentos: add empresa_id; drop the UNIQUE(tipo) so per-empresa configs are allowed
ALTER TABLE public.config_afastamentos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
DO $$
BEGIN
  ALTER TABLE public.config_afastamentos DROP CONSTRAINT IF EXISTS config_afastamentos_tipo_key;
EXCEPTION WHEN others THEN NULL;
END $$;
