-- Migration: folha_calculos
-- Description: Cálculos de folha
-- Created at: 2025-12-28T19:25:44+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS folha_calculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE folha_calculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "folha_calculos_select" ON public.folha_calculos;
CREATE POLICY "folha_calculos_select" ON folha_calculos
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "folha_calculos_insert" ON public.folha_calculos;
CREATE POLICY "folha_calculos_insert" ON folha_calculos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "folha_calculos_update" ON public.folha_calculos;
CREATE POLICY "folha_calculos_update" ON folha_calculos
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_folha_calculos_created_at ON folha_calculos(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_folha_calculos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_folha_calculos_updated_at ON public.folha_calculos;
CREATE TRIGGER trigger_folha_calculos_updated_at
  BEFORE UPDATE ON folha_calculos
  FOR EACH ROW
  EXECUTE FUNCTION update_folha_calculos_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS folha_calculos CASCADE;
