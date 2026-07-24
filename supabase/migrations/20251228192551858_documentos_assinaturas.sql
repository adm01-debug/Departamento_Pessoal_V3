-- Migration: documentos_assinaturas
-- Description: Assinaturas digitais
-- Created at: 2025-12-28T19:25:51+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS documentos_assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE documentos_assinaturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_assinaturas_select" ON public.documentos_assinaturas;
CREATE POLICY "documentos_assinaturas_select" ON documentos_assinaturas
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "documentos_assinaturas_insert" ON public.documentos_assinaturas;
CREATE POLICY "documentos_assinaturas_insert" ON documentos_assinaturas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "documentos_assinaturas_update" ON public.documentos_assinaturas;
CREATE POLICY "documentos_assinaturas_update" ON documentos_assinaturas
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documentos_assinaturas_created_at ON documentos_assinaturas(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_documentos_assinaturas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_documentos_assinaturas_updated_at ON public.documentos_assinaturas;
CREATE TRIGGER trigger_documentos_assinaturas_updated_at
  BEFORE UPDATE ON documentos_assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION update_documentos_assinaturas_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS documentos_assinaturas CASCADE;
