-- 1. Coluna denormalizada de tenant
ALTER TABLE public.pensoes ADD COLUMN IF NOT EXISTS empresa_id uuid;

-- 2. Backfill a partir do colaborador
UPDATE public.pensoes p
SET empresa_id = c.empresa_id
FROM public.colaboradores c
WHERE p.colaborador_id = c.id AND p.empresa_id IS DISTINCT FROM c.empresa_id;

-- 3. Trigger para manter sincronizado (fonte da verdade = colaborador)
CREATE OR REPLACE FUNCTION public.fn_pensoes_set_empresa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.colaborador_id IS NOT NULL THEN
    SELECT c.empresa_id INTO NEW.empresa_id
    FROM public.colaboradores c
    WHERE c.id = NEW.colaborador_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pensoes_set_empresa ON public.pensoes;
CREATE TRIGGER trg_pensoes_set_empresa
BEFORE INSERT OR UPDATE OF colaborador_id ON public.pensoes
FOR EACH ROW EXECUTE FUNCTION public.fn_pensoes_set_empresa();

-- 4. Índices para filtro multi-tenant e join
CREATE INDEX IF NOT EXISTS idx_pensoes_empresa_id ON public.pensoes (empresa_id);
CREATE INDEX IF NOT EXISTS idx_pensoes_colaborador_id ON public.pensoes (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_pensoes_empresa_ativo ON public.pensoes (empresa_id) WHERE ativo IS TRUE;

-- 5. RLS simplificada e mais rápida (mesma semântica, sem subquery em colaboradores)
DROP POLICY IF EXISTS tenant_pensoes ON public.pensoes;
CREATE POLICY tenant_pensoes ON public.pensoes
FOR ALL
TO authenticated
USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
WITH CHECK (
  colaborador_id IN (
    SELECT c.id FROM public.colaboradores c
    WHERE c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pensoes TO authenticated;
GRANT ALL ON public.pensoes TO service_role;