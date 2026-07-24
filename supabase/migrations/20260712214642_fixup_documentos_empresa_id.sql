-- Fixup: add empresa_id to documentos table
-- Required before 20260719100000 (RLS tenant policy uses empresa_id)
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

-- Backfill from colaboradores where possible
UPDATE public.documentos d
SET empresa_id = c.empresa_id
FROM public.colaboradores c
WHERE d.colaborador_id = c.id
  AND d.empresa_id IS NULL;
