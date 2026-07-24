-- Add empresa_id to periodos_aquisitivos for proper tenant isolation.
-- The column was missing from the original schema; feriasService already
-- applies .eq('empresa_id', ...) which would fail without this column.

ALTER TABLE public.periodos_aquisitivos
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

-- Backfill from the parent colaboradores row
UPDATE public.periodos_aquisitivos pa
SET empresa_id = c.empresa_id
FROM public.colaboradores c
WHERE pa.colaborador_id = c.id
  AND pa.empresa_id IS NULL;

-- Enforce NOT NULL now that backfill is done
ALTER TABLE public.periodos_aquisitivos
  ALTER COLUMN empresa_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_periodos_aquisitivos_empresa
  ON public.periodos_aquisitivos (empresa_id);

-- RLS: scope reads/writes to the colaborador's empresa
DROP POLICY IF EXISTS "Tenant isolation periodos_aquisitivos" ON public.periodos_aquisitivos;
CREATE POLICY "Tenant isolation periodos_aquisitivos"
  ON public.periodos_aquisitivos FOR ALL TO authenticated
  USING (empresa_id IN (
    SELECT empresa_id FROM public.user_empresas
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM public.user_empresas
    WHERE user_id = auth.uid()
  ));
