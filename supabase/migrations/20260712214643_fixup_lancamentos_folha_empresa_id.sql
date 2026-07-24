-- Fixup: add empresa_id to lancamentos_folha
-- Required before 20260719100000 (RLS tenant policy uses empresa_id directly)
ALTER TABLE public.lancamentos_folha ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

-- Backfill via holerites -> colaboradores chain
UPDATE public.lancamentos_folha lf
SET empresa_id = c.empresa_id
FROM public.holerites h
JOIN public.colaboradores c ON c.id = h.colaborador_id
WHERE lf.holerite_id = h.id
  AND lf.empresa_id IS NULL;
