-- Add empresa_id to tables missing tenant isolation
-- historico_cargo, colaborador_beneficios, documentos_colaborador

-- ============================================================
-- historico_cargo
-- ============================================================
ALTER TABLE public.historico_cargo
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

UPDATE public.historico_cargo hc
SET empresa_id = c.empresa_id
FROM public.colaboradores c
WHERE hc.colaborador_id = c.id AND hc.empresa_id IS NULL;

DELETE FROM public.historico_cargo WHERE empresa_id IS NULL;

ALTER TABLE public.historico_cargo ALTER COLUMN empresa_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_historico_cargo_empresa ON public.historico_cargo (empresa_id);

DROP POLICY IF EXISTS "Authenticated users can manage historico_cargo" ON public.historico_cargo;
DROP POLICY IF EXISTS "Tenant isolation historico_cargo" ON public.historico_cargo;
CREATE POLICY "Tenant isolation historico_cargo"
  ON public.historico_cargo FOR ALL TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()))
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()));

-- ============================================================
-- colaborador_beneficios — backfill from beneficios.empresa_id
-- ============================================================
ALTER TABLE public.colaborador_beneficios
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

UPDATE public.colaborador_beneficios cb
SET empresa_id = b.empresa_id
FROM public.beneficios b
WHERE cb.beneficio_id = b.id AND cb.empresa_id IS NULL;

DELETE FROM public.colaborador_beneficios WHERE empresa_id IS NULL;

ALTER TABLE public.colaborador_beneficios ALTER COLUMN empresa_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_colaborador_beneficios_empresa ON public.colaborador_beneficios (empresa_id);

DROP POLICY IF EXISTS "Auth users manage colaborador_beneficios" ON public.colaborador_beneficios;
DROP POLICY IF EXISTS "Tenant isolation colaborador_beneficios" ON public.colaborador_beneficios;
CREATE POLICY "Tenant isolation colaborador_beneficios"
  ON public.colaborador_beneficios FOR ALL TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()))
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()));

-- ============================================================
-- documentos_colaborador
-- ============================================================
ALTER TABLE public.documentos_colaborador
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;

UPDATE public.documentos_colaborador dc
SET empresa_id = c.empresa_id
FROM public.colaboradores c
WHERE dc.colaborador_id = c.id AND dc.empresa_id IS NULL;

DELETE FROM public.documentos_colaborador WHERE empresa_id IS NULL;

ALTER TABLE public.documentos_colaborador ALTER COLUMN empresa_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_colaborador_empresa ON public.documentos_colaborador (empresa_id);

DROP POLICY IF EXISTS "Authenticated users can manage documentos" ON public.documentos_colaborador;
DROP POLICY IF EXISTS "Tenant isolation documentos_colaborador" ON public.documentos_colaborador;
CREATE POLICY "Tenant isolation documentos_colaborador"
  ON public.documentos_colaborador FOR ALL TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()))
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()));
