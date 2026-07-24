-- V16-007: Fixup missing columns in base tables
-- These ALTER TABLE ... IF NOT EXISTS statements are no-ops for fresh setups
-- (base migrations 001-004 now include all columns), but are essential for
-- existing Preview branches that had the old base migrations applied without
-- these columns. Sorts between 006_configuracoes.sql and the first timestamp
-- migration (2025122813133501_create_dependentes.sql) to run before any
-- index creation that depends on these columns.

-- 001_core_tables: empresas.ativa
-- Referenced by functions (WHERE ativa = true) and indexes in timestamp migrations
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS ativa BOOLEAN DEFAULT true;

-- 002_colaboradores: dependentes missing columns
-- The original dependentes table lacked empresa_id and several other columns.
-- Timestamp migrations assume these columns exist (CREATE TABLE IF NOT EXISTS
-- is skipped since the table already exists, leaving columns absent).
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS valor DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS data_inicio DATE;
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS data_fim DATE;
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo';
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.dependentes ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 003_folha_ferias_ponto: ferias.empresa_id
-- Indexed by migrations 20260712213730 and 20260713105906
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- 004_beneficios_afastamentos: afastamentos.empresa_id
-- Indexed by migration 20260713105906
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
