-- Migration: cache_tabelas
-- Description: Cache de tabelas
-- Created at: 2025-12-28T19:25:56+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS cache_tabelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE cache_tabelas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cache_tabelas_select" ON public.cache_tabelas;
CREATE POLICY "cache_tabelas_select" ON cache_tabelas
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cache_tabelas_insert" ON public.cache_tabelas;
CREATE POLICY "cache_tabelas_insert" ON cache_tabelas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cache_tabelas_update" ON public.cache_tabelas;
CREATE POLICY "cache_tabelas_update" ON cache_tabelas
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cache_tabelas_created_at ON cache_tabelas(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_cache_tabelas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cache_tabelas_updated_at ON public.cache_tabelas;
CREATE TRIGGER trigger_cache_tabelas_updated_at
  BEFORE UPDATE ON cache_tabelas
  FOR EACH ROW
  EXECUTE FUNCTION update_cache_tabelas_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS cache_tabelas CASCADE;
