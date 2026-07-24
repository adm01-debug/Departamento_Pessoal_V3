-- Migration: notificacoes_templates
-- Description: Templates de notificações
-- Created at: 2025-12-28T19:25:55+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS notificacoes_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE notificacoes_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificacoes_templates_select" ON public.notificacoes_templates;
CREATE POLICY "notificacoes_templates_select" ON notificacoes_templates
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "notificacoes_templates_insert" ON public.notificacoes_templates;
CREATE POLICY "notificacoes_templates_insert" ON notificacoes_templates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "notificacoes_templates_update" ON public.notificacoes_templates;
CREATE POLICY "notificacoes_templates_update" ON notificacoes_templates
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notificacoes_templates_created_at ON notificacoes_templates(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_notificacoes_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notificacoes_templates_updated_at ON public.notificacoes_templates;
CREATE TRIGGER trigger_notificacoes_templates_updated_at
  BEFORE UPDATE ON notificacoes_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notificacoes_templates_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS notificacoes_templates CASCADE;
