-- Fixup: add missing columns to holerites table
-- The original holerites (created in 20251216165741) lacks columns that later
-- timestamp migrations index or reference. This sorts after 20251228000000
-- (empresa_id fixup) and before 2025122813134212_create_holerites.sql (which
-- indexes on status), ensuring all columns exist before index creation.

-- empresa_id was already added by 20251228000000_fixup_empresa_id_timestamp_tables.sql

-- status — indexed by 2025122813134212_create_holerites.sql
ALTER TABLE public.holerites ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo';

-- assinado — indexed by 20251228131627_create_holerites.sql and 20260712213730
ALTER TABLE public.holerites ADD COLUMN IF NOT EXISTS assinado BOOLEAN DEFAULT false;

-- updated_at — required by update_updated_at_column() trigger in 2025122813134212 and 20251228131627
ALTER TABLE public.holerites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Additional columns from 2025122813134212 and 20251228131627 CREATE TABLE definitions
ALTER TABLE public.holerites ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.holerites ADD COLUMN IF NOT EXISTS valor DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.holerites ADD COLUMN IF NOT EXISTS data_inicio DATE;
ALTER TABLE public.holerites ADD COLUMN IF NOT EXISTS data_fim DATE;
ALTER TABLE public.holerites ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE public.holerites ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.holerites ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.holerites ADD COLUMN IF NOT EXISTS updated_by UUID;
