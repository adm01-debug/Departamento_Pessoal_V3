-- Migration: rescisao_simulacoes
-- Description: Simulações de rescisão
-- Created at: 2025-12-28T19:25:48+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS rescisao_simulacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE rescisao_simulacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rescisao_simulacoes_select" ON public.rescisao_simulacoes;
CREATE POLICY "rescisao_simulacoes_select" ON rescisao_simulacoes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "rescisao_simulacoes_insert" ON public.rescisao_simulacoes;
CREATE POLICY "rescisao_simulacoes_insert" ON rescisao_simulacoes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "rescisao_simulacoes_update" ON public.rescisao_simulacoes;
CREATE POLICY "rescisao_simulacoes_update" ON rescisao_simulacoes
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rescisao_simulacoes_created_at ON rescisao_simulacoes(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_rescisao_simulacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_rescisao_simulacoes_updated_at ON public.rescisao_simulacoes;
CREATE TRIGGER trigger_rescisao_simulacoes_updated_at
  BEFORE UPDATE ON rescisao_simulacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_rescisao_simulacoes_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS rescisao_simulacoes CASCADE;
