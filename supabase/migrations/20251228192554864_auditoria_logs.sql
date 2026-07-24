-- Migration: auditoria_logs
-- Description: Logs de auditoria
-- Created at: 2025-12-28T19:25:54+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS auditoria_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE auditoria_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auditoria_logs_select" ON public.auditoria_logs;
CREATE POLICY "auditoria_logs_select" ON auditoria_logs
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auditoria_logs_insert" ON public.auditoria_logs;
CREATE POLICY "auditoria_logs_insert" ON auditoria_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auditoria_logs_update" ON public.auditoria_logs;
CREATE POLICY "auditoria_logs_update" ON auditoria_logs
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_created_at ON auditoria_logs(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_auditoria_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auditoria_logs_updated_at ON public.auditoria_logs;
CREATE TRIGGER trigger_auditoria_logs_updated_at
  BEFORE UPDATE ON auditoria_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_auditoria_logs_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS auditoria_logs CASCADE;
