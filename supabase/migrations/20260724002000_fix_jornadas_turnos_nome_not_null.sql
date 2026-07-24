-- Issue 48: Reforça NOT NULL em jornadas.nome e turnos.(nome, horario_inicio, horario_fim).
--
-- 20260724000400_fix_jornadas_missing_business_columns.sql e
-- 20260724000800_fix_turnos_missing_business_columns.sql adicionaram esses campos
-- como TEXT nullable via ADD COLUMN IF NOT EXISTS. Porém o schema pretendido (e
-- as types TypeScript em src/integrations/supabase/types.ts) exigem:
--   jornadas.nome              → string (NOT NULL)
--   turnos.nome                → string (NOT NULL)
--   turnos.horario_inicio      → string (NOT NULL)
--   turnos.horario_fim         → string (NOT NULL)
--
-- Em bancos frescos (preview / CI) não há rows — os UPDATEs são no-ops,
-- e o SET NOT NULL finaliza imediatamente.
-- Em produção com rows legacy NULL: backfill com placeholder antes do constraint.
-- Qualquer row criada pelo app já deve ter esses valores via validação TypeScript.

-- ── jornadas.nome ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jornadas'
      AND column_name = 'nome'
      AND is_nullable = 'YES'
  ) THEN
    -- Backfill: registros sem nome recebem identificador derivado do UUID
    UPDATE public.jornadas
      SET nome = 'Jornada ' || LEFT(id::text, 8)
      WHERE nome IS NULL OR nome = '';

    ALTER TABLE public.jornadas ALTER COLUMN nome SET NOT NULL;
  END IF;
END $$;

-- ── turnos.nome ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'turnos'
      AND column_name = 'nome'
      AND is_nullable = 'YES'
  ) THEN
    UPDATE public.turnos
      SET nome = 'Turno ' || LEFT(id::text, 8)
      WHERE nome IS NULL OR nome = '';

    ALTER TABLE public.turnos ALTER COLUMN nome SET NOT NULL;
  END IF;
END $$;

-- ── turnos.horario_inicio ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'turnos'
      AND column_name = 'horario_inicio'
      AND is_nullable = 'YES'
  ) THEN
    -- Backfill com padrão de horário comercial; qualquer valor real sobrescreve via app
    UPDATE public.turnos
      SET horario_inicio = '08:00'
      WHERE horario_inicio IS NULL OR horario_inicio = '';

    ALTER TABLE public.turnos ALTER COLUMN horario_inicio SET NOT NULL;
  END IF;
END $$;

-- ── turnos.horario_fim ────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'turnos'
      AND column_name = 'horario_fim'
      AND is_nullable = 'YES'
  ) THEN
    UPDATE public.turnos
      SET horario_fim = '17:00'
      WHERE horario_fim IS NULL OR horario_fim = '';

    ALTER TABLE public.turnos ALTER COLUMN horario_fim SET NOT NULL;
  END IF;
END $$;
