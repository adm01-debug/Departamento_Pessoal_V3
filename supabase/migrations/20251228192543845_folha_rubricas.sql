-- Migration: folha_rubricas
-- Description: Rubricas de folha
-- Created at: 2025-12-28T19:25:43+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS folha_rubricas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE folha_rubricas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "folha_rubricas_select" ON public.folha_rubricas;
CREATE POLICY "folha_rubricas_select" ON folha_rubricas
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "folha_rubricas_insert" ON public.folha_rubricas;
CREATE POLICY "folha_rubricas_insert" ON folha_rubricas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "folha_rubricas_update" ON public.folha_rubricas;
CREATE POLICY "folha_rubricas_update" ON folha_rubricas
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_folha_rubricas_created_at ON folha_rubricas(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_folha_rubricas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_folha_rubricas_updated_at ON public.folha_rubricas;
CREATE TRIGGER trigger_folha_rubricas_updated_at
  BEFORE UPDATE ON folha_rubricas
  FOR EACH ROW
  EXECUTE FUNCTION update_folha_rubricas_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS folha_rubricas CASCADE;
