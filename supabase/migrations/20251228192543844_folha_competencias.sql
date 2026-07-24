-- Migration: folha_competencias
-- Description: Competências de folha de pagamento
-- Created at: 2025-12-28T19:25:43+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS folha_competencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE folha_competencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "folha_competencias_select" ON public.folha_competencias;
CREATE POLICY "folha_competencias_select" ON folha_competencias
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "folha_competencias_insert" ON public.folha_competencias;
CREATE POLICY "folha_competencias_insert" ON folha_competencias
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "folha_competencias_update" ON public.folha_competencias;
CREATE POLICY "folha_competencias_update" ON folha_competencias
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_folha_competencias_created_at ON folha_competencias(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_folha_competencias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_folha_competencias_updated_at ON public.folha_competencias;
CREATE TRIGGER trigger_folha_competencias_updated_at
  BEFORE UPDATE ON folha_competencias
  FOR EACH ROW
  EXECUTE FUNCTION update_folha_competencias_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS folha_competencias CASCADE;
