-- Migration: ferias_abono
-- Description: Abono de férias
-- Created at: 2025-12-28T19:25:47+00:00

-- Up Migration
CREATE TABLE IF NOT EXISTS ferias_abono (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE ferias_abono ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ferias_abono_select" ON public.ferias_abono;
CREATE POLICY "ferias_abono_select" ON ferias_abono
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ferias_abono_insert" ON public.ferias_abono;
CREATE POLICY "ferias_abono_insert" ON ferias_abono
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ferias_abono_update" ON public.ferias_abono;
CREATE POLICY "ferias_abono_update" ON ferias_abono
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ferias_abono_created_at ON ferias_abono(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_ferias_abono_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ferias_abono_updated_at ON public.ferias_abono;
CREATE TRIGGER trigger_ferias_abono_updated_at
  BEFORE UPDATE ON ferias_abono
  FOR EACH ROW
  EXECUTE FUNCTION update_ferias_abono_updated_at();

-- Down Migration (rollback)
-- DROP TABLE IF EXISTS ferias_abono CASCADE;
