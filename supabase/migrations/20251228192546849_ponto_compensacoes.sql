-- Migration: ponto_compensacoes
-- Description: Compensações de ponto
-- Created at: 2025-12-28T19:25:46+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS ponto_compensacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE ponto_compensacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ponto_compensacoes_select" ON public.ponto_compensacoes;
CREATE POLICY "ponto_compensacoes_select" ON ponto_compensacoes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ponto_compensacoes_insert" ON public.ponto_compensacoes;
CREATE POLICY "ponto_compensacoes_insert" ON ponto_compensacoes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ponto_compensacoes_update" ON public.ponto_compensacoes;
CREATE POLICY "ponto_compensacoes_update" ON ponto_compensacoes
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ponto_compensacoes_created_at ON ponto_compensacoes(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_ponto_compensacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ponto_compensacoes_updated_at ON public.ponto_compensacoes;
CREATE TRIGGER trigger_ponto_compensacoes_updated_at
  BEFORE UPDATE ON ponto_compensacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_ponto_compensacoes_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS ponto_compensacoes CASCADE;
