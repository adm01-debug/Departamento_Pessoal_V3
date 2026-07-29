-- 1) Backfill: os 2 times estavam com tenant nulo, o que os tornava invisiveis
-- para todos (a politica de `times` exige empresa_id IN get_user_empresas()).
-- Existe exatamente 1 empresa cadastrada, entao a atribuicao e inequivoca.
UPDATE public.times t
SET empresa_id = (SELECT e.id FROM public.empresas e ORDER BY e.created_at LIMIT 1)
WHERE t.empresa_id IS NULL
  AND (SELECT count(*) FROM public.empresas) = 1;

-- 2) Trava: sem isso, qualquer insert que esqueca o tenant recria o orfao
-- silenciosamente (o registro some da tela em vez de dar erro).
ALTER TABLE public.times
  ALTER COLUMN empresa_id SET NOT NULL;
