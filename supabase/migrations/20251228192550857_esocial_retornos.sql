-- Migration: esocial_retornos
-- Description: Retornos eSocial
-- Created at: 2025-12-28T19:25:50+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS esocial_retornos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE esocial_retornos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esocial_retornos_select" ON public.esocial_retornos;
CREATE POLICY "esocial_retornos_select" ON esocial_retornos
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "esocial_retornos_insert" ON public.esocial_retornos;
CREATE POLICY "esocial_retornos_insert" ON esocial_retornos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "esocial_retornos_update" ON public.esocial_retornos;
CREATE POLICY "esocial_retornos_update" ON esocial_retornos
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_esocial_retornos_created_at ON esocial_retornos(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_esocial_retornos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_esocial_retornos_updated_at ON public.esocial_retornos;
CREATE TRIGGER trigger_esocial_retornos_updated_at
  BEFORE UPDATE ON esocial_retornos
  FOR EACH ROW
  EXECUTE FUNCTION update_esocial_retornos_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS esocial_retornos CASCADE;
