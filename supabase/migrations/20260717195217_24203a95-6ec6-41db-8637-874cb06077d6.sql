
-- ============================================================
-- Etapa 8: Gestão de Extintores e Inspeções (NR-23)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sst_extintores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo_patrimonio TEXT NOT NULL,
  numero_serie TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('AGUA','PO_QUIMICO_ABC','PO_QUIMICO_BC','CO2','ESPUMA','CLASSE_K')),
  capacidade_kg NUMERIC(6,2) NOT NULL CHECK (capacidade_kg > 0),
  fabricante TEXT,
  data_fabricacao DATE,
  data_ultima_recarga DATE,
  data_proxima_recarga DATE NOT NULL,
  data_ultimo_teste_hidrostatico DATE,
  data_proximo_teste_hidrostatico DATE NOT NULL,
  localizacao TEXT NOT NULL,
  local_trabalho_id UUID REFERENCES public.locais_trabalho(id) ON DELETE SET NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  qr_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','MANUTENCAO','VENCIDO','DESATIVADO','EXTRAVIADO')),
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(empresa_id, codigo_patrimonio)
);

CREATE INDEX IF NOT EXISTS idx_extintores_empresa ON public.sst_extintores(empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_extintores_recarga ON public.sst_extintores(empresa_id, data_proxima_recarga) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_extintores_hidro ON public.sst_extintores(empresa_id, data_proximo_teste_hidrostatico) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_extintores_status ON public.sst_extintores(empresa_id, status) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_extintores TO authenticated;
GRANT ALL ON public.sst_extintores TO service_role;

ALTER TABLE public.sst_extintores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage extintores from their empresa" ON public.sst_extintores;
CREATE POLICY "Users manage extintores from their empresa"
ON public.sst_extintores FOR ALL
TO authenticated
USING (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()))
WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()));

-- ============================================================
-- Inspeções mensais (NR-23)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sst_extintores_inspecoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extintor_id UUID NOT NULL REFERENCES public.sst_extintores(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data_inspecao DATE NOT NULL DEFAULT CURRENT_DATE,
  inspetor_id UUID REFERENCES auth.users(id),
  inspetor_nome TEXT NOT NULL,
  lacre_ok BOOLEAN NOT NULL DEFAULT true,
  pressao_ok BOOLEAN NOT NULL DEFAULT true,
  mangueira_ok BOOLEAN NOT NULL DEFAULT true,
  sinalizacao_ok BOOLEAN NOT NULL DEFAULT true,
  acesso_desobstruido BOOLEAN NOT NULL DEFAULT true,
  altura_correta BOOLEAN NOT NULL DEFAULT true,
  corpo_integro BOOLEAN NOT NULL DEFAULT true,
  resultado TEXT NOT NULL CHECK (resultado IN ('CONFORME','NAO_CONFORME','REQUER_MANUTENCAO')),
  observacoes TEXT,
  foto_url TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insp_extintor ON public.sst_extintores_inspecoes(extintor_id, data_inspecao DESC);
CREATE INDEX IF NOT EXISTS idx_insp_empresa_data ON public.sst_extintores_inspecoes(empresa_id, data_inspecao DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_extintores_inspecoes TO authenticated;
GRANT ALL ON public.sst_extintores_inspecoes TO service_role;

ALTER TABLE public.sst_extintores_inspecoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage inspecoes from their empresa" ON public.sst_extintores_inspecoes;
CREATE POLICY "Users manage inspecoes from their empresa"
ON public.sst_extintores_inspecoes FOR ALL
TO authenticated
USING (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()))
WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()));

-- ============================================================
-- Trigger: atualiza status do extintor quando vencido
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_extintor_status_vencimento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.data_proxima_recarga < CURRENT_DATE 
     OR NEW.data_proximo_teste_hidrostatico < CURRENT_DATE THEN
    IF NEW.status = 'ATIVO' THEN
      NEW.status := 'VENCIDO';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_extintor_vencimento ON public.sst_extintores;
CREATE TRIGGER trg_extintor_vencimento
BEFORE INSERT OR UPDATE ON public.sst_extintores
FOR EACH ROW
EXECUTE FUNCTION public.update_extintor_status_vencimento();

-- ============================================================
-- Trigger: gera QR code automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.gerar_qr_extintor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.qr_code IS NULL THEN
    NEW.qr_code := 'EXT-' || substr(NEW.id::text, 1, 8) || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_qr_extintor ON public.sst_extintores;
CREATE TRIGGER trg_gerar_qr_extintor
BEFORE INSERT ON public.sst_extintores
FOR EACH ROW
EXECUTE FUNCTION public.gerar_qr_extintor();

-- ============================================================
-- RPC: dashboard de extintores
-- ============================================================
CREATE OR REPLACE FUNCTION public.sst_extintores_dashboard(p_empresa_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_empresas WHERE user_id = auth.uid() AND empresa_id = p_empresa_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'ativos', COUNT(*) FILTER (WHERE status = 'ATIVO'),
    'vencidos', COUNT(*) FILTER (WHERE status = 'VENCIDO'),
    'em_manutencao', COUNT(*) FILTER (WHERE status = 'MANUTENCAO'),
    'recarga_30d', COUNT(*) FILTER (WHERE data_proxima_recarga BETWEEN CURRENT_DATE AND CURRENT_DATE + 30),
    'hidro_90d', COUNT(*) FILTER (WHERE data_proximo_teste_hidrostatico BETWEEN CURRENT_DATE AND CURRENT_DATE + 90),
    'inspecoes_mes', (SELECT COUNT(*) FROM public.sst_extintores_inspecoes 
                       WHERE empresa_id = p_empresa_id 
                       AND data_inspecao >= date_trunc('month', CURRENT_DATE)),
    'nao_conformes_mes', (SELECT COUNT(*) FROM public.sst_extintores_inspecoes 
                           WHERE empresa_id = p_empresa_id 
                           AND data_inspecao >= date_trunc('month', CURRENT_DATE)
                           AND resultado <> 'CONFORME')
  ) INTO v_result
  FROM public.sst_extintores
  WHERE empresa_id = p_empresa_id AND deleted_at IS NULL;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.sst_extintores_dashboard(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sst_extintores_dashboard(UUID) TO authenticated;
