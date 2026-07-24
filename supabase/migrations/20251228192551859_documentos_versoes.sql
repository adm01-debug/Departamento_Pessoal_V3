-- Migration: documentos_versoes
-- Description: Versionamento de documentos
-- Created at: 2025-12-28T19:25:51+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS documentos_versoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE documentos_versoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_versoes_select" ON public.documentos_versoes;
CREATE POLICY "documentos_versoes_select" ON documentos_versoes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "documentos_versoes_insert" ON public.documentos_versoes;
CREATE POLICY "documentos_versoes_insert" ON documentos_versoes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "documentos_versoes_update" ON public.documentos_versoes;
CREATE POLICY "documentos_versoes_update" ON documentos_versoes
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documentos_versoes_created_at ON documentos_versoes(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_documentos_versoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_documentos_versoes_updated_at ON public.documentos_versoes;
CREATE TRIGGER trigger_documentos_versoes_updated_at
  BEFORE UPDATE ON documentos_versoes
  FOR EACH ROW
  EXECUTE FUNCTION update_documentos_versoes_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS documentos_versoes CASCADE;
