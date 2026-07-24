-- Migration: sst_epis
-- Description: Controle de EPIs
-- Created at: 2025-12-28T19:25:53+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS sst_epis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE sst_epis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sst_epis_select" ON public.sst_epis;
CREATE POLICY "sst_epis_select" ON sst_epis
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sst_epis_insert" ON public.sst_epis;
CREATE POLICY "sst_epis_insert" ON sst_epis
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sst_epis_update" ON public.sst_epis;
CREATE POLICY "sst_epis_update" ON sst_epis
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sst_epis_created_at ON sst_epis(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_sst_epis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sst_epis_updated_at ON public.sst_epis;
CREATE TRIGGER trigger_sst_epis_updated_at
  BEFORE UPDATE ON sst_epis
  FOR EACH ROW
  EXECUTE FUNCTION update_sst_epis_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS sst_epis CASCADE;
