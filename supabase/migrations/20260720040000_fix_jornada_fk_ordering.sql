-- Fix migration ordering: 20251216164758 added jornada_id as plain UUID
-- (to avoid referencing jornadas before it was created in 20251228131617).
-- Now that jornadas exists, add the FK constraint idempotently.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'colaboradores_jornada_id_fkey'
      AND conrelid = 'public.colaboradores'::regclass
  ) THEN
    ALTER TABLE public.colaboradores
      ADD CONSTRAINT colaboradores_jornada_id_fkey
      FOREIGN KEY (jornada_id) REFERENCES public.jornadas(id);
  END IF;
END $$;
