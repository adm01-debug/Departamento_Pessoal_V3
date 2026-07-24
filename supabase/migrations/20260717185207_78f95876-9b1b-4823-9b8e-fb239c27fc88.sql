
-- ============================================================
-- Etapa 1 — Rede de Clínicas Credenciadas (Vixting-parity)
-- ============================================================

-- 1) CLINICAS PARTNERS ---------------------------------------
CREATE TABLE IF NOT EXISTS public.clinicas_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  responsavel_tecnico TEXT,
  crm_responsavel TEXT,
  -- Endereço
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT CHECK (uf IS NULL OR char_length(uf) = 2),
  -- Geo
  geo_lat NUMERIC(10,7),
  geo_lng NUMERIC(10,7),
  -- Operacional
  especialidades TEXT[] NOT NULL DEFAULT '{}',
  tipos_exame TEXT[] NOT NULL DEFAULT '{}',
  sla_medio_min INTEGER,
  rating NUMERIC(3,2) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  aceita_convenio BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','suspenso')),
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinicas_partners_cnpj_empresa_unique UNIQUE (empresa_id, cnpj)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinicas_partners TO authenticated;
GRANT ALL ON public.clinicas_partners TO service_role;
ALTER TABLE public.clinicas_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinicas_partners_select_empresa" ON public.clinicas_partners;
CREATE POLICY "clinicas_partners_select_empresa"
  ON public.clinicas_partners FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_empresas ue
      WHERE ue.user_id = auth.uid() AND ue.empresa_id = clinicas_partners.empresa_id
    )
  );

DROP POLICY IF EXISTS "clinicas_partners_manage_admin_rh" ON public.clinicas_partners;
CREATE POLICY "clinicas_partners_manage_admin_rh"
  ON public.clinicas_partners FOR ALL TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.user_empresas ue
      WHERE ue.user_id = auth.uid() AND ue.empresa_id = clinicas_partners.empresa_id
    )
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.user_empresas ue
      WHERE ue.user_id = auth.uid() AND ue.empresa_id = clinicas_partners.empresa_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_clinicas_partners_empresa_status ON public.clinicas_partners (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_clinicas_partners_cidade_uf ON public.clinicas_partners (uf, cidade);
CREATE INDEX IF NOT EXISTS idx_clinicas_partners_geo ON public.clinicas_partners (geo_lat, geo_lng) WHERE geo_lat IS NOT NULL;

-- 2) SERVIÇOS OFERECIDOS -------------------------------------
CREATE TABLE IF NOT EXISTS public.clinicas_partners_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas_partners(id) ON DELETE CASCADE,
  tipo_exame TEXT NOT NULL,
  preco NUMERIC(10,2),
  prazo_resultado_dias INTEGER,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinicas_servicos_unique UNIQUE (clinica_id, tipo_exame)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinicas_partners_servicos TO authenticated;
GRANT ALL ON public.clinicas_partners_servicos TO service_role;
ALTER TABLE public.clinicas_partners_servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinicas_servicos_via_clinica" ON public.clinicas_partners_servicos;
CREATE POLICY "clinicas_servicos_via_clinica"
  ON public.clinicas_partners_servicos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinicas_partners c
      JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id
      WHERE c.id = clinicas_partners_servicos.clinica_id
        AND ue.user_id = auth.uid()
    )
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.clinicas_partners c
      JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id
      WHERE c.id = clinicas_partners_servicos.clinica_id
        AND ue.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_clinicas_servicos_clinica ON public.clinicas_partners_servicos (clinica_id, ativo);

-- 3) HORÁRIOS ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinicas_partners_horarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas_partners(id) ON DELETE CASCADE,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Dom .. 6=Sab
  hora_abertura TIME NOT NULL,
  hora_fechamento TIME NOT NULL,
  intervalo_slot_min INTEGER NOT NULL DEFAULT 30 CHECK (intervalo_slot_min > 0),
  capacidade_por_slot INTEGER NOT NULL DEFAULT 1 CHECK (capacidade_por_slot > 0),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinicas_horarios_unique UNIQUE (clinica_id, dia_semana, hora_abertura),
  CONSTRAINT clinicas_horarios_intervalo_valido CHECK (hora_fechamento > hora_abertura)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinicas_partners_horarios TO authenticated;
GRANT ALL ON public.clinicas_partners_horarios TO service_role;
ALTER TABLE public.clinicas_partners_horarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinicas_horarios_via_clinica" ON public.clinicas_partners_horarios;
CREATE POLICY "clinicas_horarios_via_clinica"
  ON public.clinicas_partners_horarios FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinicas_partners c
      JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id
      WHERE c.id = clinicas_partners_horarios.clinica_id
        AND ue.user_id = auth.uid()
    )
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'rh'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.clinicas_partners c
      JOIN public.user_empresas ue ON ue.empresa_id = c.empresa_id
      WHERE c.id = clinicas_partners_horarios.clinica_id
        AND ue.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_clinicas_horarios_clinica_dia ON public.clinicas_partners_horarios (clinica_id, dia_semana);

-- 4) TRIGGERS updated_at -------------------------------------
DROP TRIGGER IF EXISTS trg_clinicas_partners_upd ON public.clinicas_partners;
CREATE TRIGGER trg_clinicas_partners_upd
  BEFORE UPDATE ON public.clinicas_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_clinicas_servicos_upd ON public.clinicas_partners_servicos;
CREATE TRIGGER trg_clinicas_servicos_upd
  BEFORE UPDATE ON public.clinicas_partners_servicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_clinicas_horarios_upd ON public.clinicas_partners_horarios;
CREATE TRIGGER trg_clinicas_horarios_upd
  BEFORE UPDATE ON public.clinicas_partners_horarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
