-- Migration: treinamentos_avaliacoes
-- Description: Avaliações de treinamentos
-- Created at: 2025-12-28T19:25:52+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS treinamentos_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE treinamentos_avaliacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treinamentos_avaliacoes_select" ON public.treinamentos_avaliacoes;
CREATE POLICY "treinamentos_avaliacoes_select" ON treinamentos_avaliacoes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "treinamentos_avaliacoes_insert" ON public.treinamentos_avaliacoes;
CREATE POLICY "treinamentos_avaliacoes_insert" ON treinamentos_avaliacoes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "treinamentos_avaliacoes_update" ON public.treinamentos_avaliacoes;
CREATE POLICY "treinamentos_avaliacoes_update" ON treinamentos_avaliacoes
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_treinamentos_avaliacoes_created_at ON treinamentos_avaliacoes(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_treinamentos_avaliacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_treinamentos_avaliacoes_updated_at ON public.treinamentos_avaliacoes;
CREATE TRIGGER trigger_treinamentos_avaliacoes_updated_at
  BEFORE UPDATE ON treinamentos_avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_treinamentos_avaliacoes_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS treinamentos_avaliacoes CASCADE;
