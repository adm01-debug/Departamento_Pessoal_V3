-- Migration: ponto_escalas
-- Description: Escalas de trabalho
-- Created at: 2025-12-28T19:25:45+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS ponto_escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE ponto_escalas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ponto_escalas_select" ON public.ponto_escalas;
CREATE POLICY "ponto_escalas_select" ON ponto_escalas
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ponto_escalas_insert" ON public.ponto_escalas;
CREATE POLICY "ponto_escalas_insert" ON ponto_escalas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ponto_escalas_update" ON public.ponto_escalas;
CREATE POLICY "ponto_escalas_update" ON ponto_escalas
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ponto_escalas_created_at ON ponto_escalas(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_ponto_escalas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ponto_escalas_updated_at ON public.ponto_escalas;
CREATE TRIGGER trigger_ponto_escalas_updated_at
  BEFORE UPDATE ON ponto_escalas
  FOR EACH ROW
  EXECUTE FUNCTION update_ponto_escalas_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS ponto_escalas CASCADE;
