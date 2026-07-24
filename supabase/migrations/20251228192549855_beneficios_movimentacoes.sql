-- Migration: beneficios_movimentacoes
-- Description: Movimentações de benefícios
-- Created at: 2025-12-28T19:25:49+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS beneficios_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE beneficios_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beneficios_movimentacoes_select" ON public.beneficios_movimentacoes;
CREATE POLICY "beneficios_movimentacoes_select" ON beneficios_movimentacoes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "beneficios_movimentacoes_insert" ON public.beneficios_movimentacoes;
CREATE POLICY "beneficios_movimentacoes_insert" ON beneficios_movimentacoes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "beneficios_movimentacoes_update" ON public.beneficios_movimentacoes;
CREATE POLICY "beneficios_movimentacoes_update" ON beneficios_movimentacoes
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_beneficios_movimentacoes_created_at ON beneficios_movimentacoes(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_beneficios_movimentacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_beneficios_movimentacoes_updated_at ON public.beneficios_movimentacoes;
CREATE TRIGGER trigger_beneficios_movimentacoes_updated_at
  BEFORE UPDATE ON beneficios_movimentacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_beneficios_movimentacoes_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS beneficios_movimentacoes CASCADE;
