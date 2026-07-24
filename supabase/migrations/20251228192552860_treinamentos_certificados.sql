-- Migration: treinamentos_certificados
-- Description: Certificados de treinamentos
-- Created at: 2025-12-28T19:25:52+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS treinamentos_certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE treinamentos_certificados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treinamentos_certificados_select" ON public.treinamentos_certificados;
CREATE POLICY "treinamentos_certificados_select" ON treinamentos_certificados
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "treinamentos_certificados_insert" ON public.treinamentos_certificados;
CREATE POLICY "treinamentos_certificados_insert" ON treinamentos_certificados
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "treinamentos_certificados_update" ON public.treinamentos_certificados;
CREATE POLICY "treinamentos_certificados_update" ON treinamentos_certificados
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_treinamentos_certificados_created_at ON treinamentos_certificados(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_treinamentos_certificados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_treinamentos_certificados_updated_at ON public.treinamentos_certificados;
CREATE TRIGGER trigger_treinamentos_certificados_updated_at
  BEFORE UPDATE ON treinamentos_certificados
  FOR EACH ROW
  EXECUTE FUNCTION update_treinamentos_certificados_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS treinamentos_certificados CASCADE;
