-- Migration: esocial_lotes
-- Description: Lotes eSocial
-- Created at: 2025-12-28T19:25:50+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS esocial_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE esocial_lotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esocial_lotes_select" ON public.esocial_lotes;
CREATE POLICY "esocial_lotes_select" ON esocial_lotes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "esocial_lotes_insert" ON public.esocial_lotes;
CREATE POLICY "esocial_lotes_insert" ON esocial_lotes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "esocial_lotes_update" ON public.esocial_lotes;
CREATE POLICY "esocial_lotes_update" ON esocial_lotes
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_esocial_lotes_created_at ON esocial_lotes(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_esocial_lotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_esocial_lotes_updated_at ON public.esocial_lotes;
CREATE TRIGGER trigger_esocial_lotes_updated_at
  BEFORE UPDATE ON esocial_lotes
  FOR EACH ROW
  EXECUTE FUNCTION update_esocial_lotes_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS esocial_lotes CASCADE;
