-- Migration: sst_exames
-- Description: Exames ocupacionais
-- Created at: 2025-12-28T19:25:53+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS sst_exames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE sst_exames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sst_exames_select" ON public.sst_exames;
CREATE POLICY "sst_exames_select" ON sst_exames
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sst_exames_insert" ON public.sst_exames;
CREATE POLICY "sst_exames_insert" ON sst_exames
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sst_exames_update" ON public.sst_exames;
CREATE POLICY "sst_exames_update" ON sst_exames
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sst_exames_created_at ON sst_exames(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_sst_exames_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sst_exames_updated_at ON public.sst_exames;
CREATE TRIGGER trigger_sst_exames_updated_at
  BEFORE UPDATE ON sst_exames
  FOR EACH ROW
  EXECUTE FUNCTION update_sst_exames_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS sst_exames CASCADE;
