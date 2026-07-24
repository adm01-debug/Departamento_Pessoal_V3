
-- Ordens de Serviço (NR-01, item 1.5.3.3)
CREATE TABLE IF NOT EXISTS public.sst_ordens_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  escopo TEXT NOT NULL CHECK (escopo IN ('cargo','colaborador')),
  cargo_id UUID REFERENCES public.cargos(id) ON DELETE SET NULL,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao_atividades TEXT,
  riscos JSONB NOT NULL DEFAULT '[]'::jsonb,
  medidas_controle JSONB NOT NULL DEFAULT '[]'::jsonb,
  epis_obrigatorios JSONB NOT NULL DEFAULT '[]'::jsonb,
  procedimentos_emergencia TEXT,
  penalidades_descumprimento TEXT,
  responsavel_nome TEXT,
  responsavel_cargo TEXT,
  responsavel_registro TEXT,
  arquivo_path TEXT,
  hash_sha256 TEXT,
  versao INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('rascunho','ativa','arquivada')),
  gerado_por UUID REFERENCES auth.users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_os_escopo CHECK (
    (escopo = 'cargo' AND cargo_id IS NOT NULL) OR
    (escopo = 'colaborador' AND colaborador_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_sst_os_empresa ON public.sst_ordens_servico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sst_os_cargo ON public.sst_ordens_servico(cargo_id) WHERE cargo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sst_os_colab ON public.sst_ordens_servico(colaborador_id) WHERE colaborador_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sst_os_status ON public.sst_ordens_servico(empresa_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_ordens_servico TO authenticated;
GRANT ALL ON public.sst_ordens_servico TO service_role;
ALTER TABLE public.sst_ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "OS visíveis para membros da empresa" ON public.sst_ordens_servico;
CREATE POLICY "OS visíveis para membros da empresa"
ON public.sst_ordens_servico FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = sst_ordens_servico.empresa_id));

DROP POLICY IF EXISTS "OS gerenciáveis por admin/rh" ON public.sst_ordens_servico;
CREATE POLICY "OS gerenciáveis por admin/rh"
ON public.sst_ordens_servico FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = sst_ordens_servico.empresa_id)
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = sst_ordens_servico.empresa_id)
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
);

DROP TRIGGER IF EXISTS trg_sst_os_updated ON public.sst_ordens_servico;
CREATE TRIGGER trg_sst_os_updated BEFORE UPDATE ON public.sst_ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LTCAT (Laudo Técnico das Condições Ambientais do Trabalho)
CREATE TABLE IF NOT EXISTS public.sst_ltcat_laudos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  ghes_avaliados JSONB NOT NULL DEFAULT '[]'::jsonb,
  agentes_nocivos JSONB NOT NULL DEFAULT '[]'::jsonb,
  medicoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  conclusao TEXT,
  aposentadoria_especial JSONB NOT NULL DEFAULT '{}'::jsonb,
  responsavel_tecnico_nome TEXT NOT NULL,
  responsavel_tecnico_registro TEXT NOT NULL,
  responsavel_tecnico_tipo TEXT CHECK (responsavel_tecnico_tipo IN ('engenheiro','medico')),
  arquivo_path TEXT,
  hash_sha256 TEXT,
  versao INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('rascunho','ativo','arquivado','revisao')),
  gerado_por UUID REFERENCES auth.users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ltcat_empresa ON public.sst_ltcat_laudos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ltcat_status ON public.sst_ltcat_laudos(empresa_id, status);
CREATE UNIQUE INDEX idx_ltcat_ativo_unico ON public.sst_ltcat_laudos(empresa_id) WHERE status = 'ativo';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_ltcat_laudos TO authenticated;
GRANT ALL ON public.sst_ltcat_laudos TO service_role;
ALTER TABLE public.sst_ltcat_laudos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "LTCAT visível para membros da empresa" ON public.sst_ltcat_laudos;
CREATE POLICY "LTCAT visível para membros da empresa"
ON public.sst_ltcat_laudos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = sst_ltcat_laudos.empresa_id));

DROP POLICY IF EXISTS "LTCAT gerenciável por admin/rh" ON public.sst_ltcat_laudos;
CREATE POLICY "LTCAT gerenciável por admin/rh"
ON public.sst_ltcat_laudos FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = sst_ltcat_laudos.empresa_id)
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = sst_ltcat_laudos.empresa_id)
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
);

DROP TRIGGER IF EXISTS trg_ltcat_updated ON public.sst_ltcat_laudos;
CREATE TRIGGER trg_ltcat_updated BEFORE UPDATE ON public.sst_ltcat_laudos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
