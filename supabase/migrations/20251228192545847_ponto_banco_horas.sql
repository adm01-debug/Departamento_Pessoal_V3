-- Migration: ponto_banco_horas
-- Description: Banco de horas
-- Created at: 2025-12-28T19:25:45+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS ponto_banco_horas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE ponto_banco_horas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ponto_banco_horas_select" ON public.ponto_banco_horas;
CREATE POLICY "ponto_banco_horas_select" ON ponto_banco_horas
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ponto_banco_horas_insert" ON public.ponto_banco_horas;
CREATE POLICY "ponto_banco_horas_insert" ON ponto_banco_horas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ponto_banco_horas_update" ON public.ponto_banco_horas;
CREATE POLICY "ponto_banco_horas_update" ON ponto_banco_horas
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ponto_banco_horas_created_at ON ponto_banco_horas(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_ponto_banco_horas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ponto_banco_horas_updated_at ON public.ponto_banco_horas;
CREATE TRIGGER trigger_ponto_banco_horas_updated_at
  BEFORE UPDATE ON ponto_banco_horas
  FOR EACH ROW
  EXECUTE FUNCTION update_ponto_banco_horas_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS ponto_banco_horas CASCADE;
