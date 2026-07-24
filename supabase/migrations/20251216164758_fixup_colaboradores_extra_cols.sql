-- Fixup: additional columns missing from 002_colaboradores.sql
-- The CREATE TABLE IF NOT EXISTS in 20251216164756 was skipped.
-- 20260317001935 creates vw_colaboradores_completo using c.data_desligamento -> fails.
-- 20260317003325 and 20260317005557 join colaboradores.jornada_id -> would fail.
-- 20260516174149 selects c.email_corporativo -> would fail.

ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS data_desligamento DATE;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS email_corporativo TEXT;
-- FK added later in 20260720040000_fix_jornada_fk_ordering.sql after jornadas table exists
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS jornada_id UUID;
