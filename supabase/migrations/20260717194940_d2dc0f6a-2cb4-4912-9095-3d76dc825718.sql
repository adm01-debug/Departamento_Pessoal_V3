
CREATE TABLE IF NOT EXISTS public.epis_fichas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  responsavel_id UUID REFERENCES auth.users(id),
  responsavel_nome TEXT NOT NULL,
  tipo_movimento TEXT NOT NULL DEFAULT 'entrega' CHECK (tipo_movimento IN ('entrega','devolucao','substituicao','recusa')),
  motivo TEXT,
  observacoes TEXT,
  evidencia_foto_path TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','assinada','recusada','cancelada')),
  assinada_em TIMESTAMPTZ,
  hash_sha256 TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_epis_fichas_empresa ON public.epis_fichas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_epis_fichas_colab ON public.epis_fichas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_epis_fichas_status ON public.epis_fichas(empresa_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.epis_fichas TO authenticated;
GRANT ALL ON public.epis_fichas TO service_role;
ALTER TABLE public.epis_fichas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ficha EPI visível para membros da empresa" ON public.epis_fichas;
CREATE POLICY "Ficha EPI visível para membros da empresa"
ON public.epis_fichas FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = epis_fichas.empresa_id));

DROP POLICY IF EXISTS "Ficha EPI gerenciável por admin/rh" ON public.epis_fichas;
CREATE POLICY "Ficha EPI gerenciável por admin/rh"
ON public.epis_fichas FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = epis_fichas.empresa_id)
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = epis_fichas.empresa_id)
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
);

DROP TRIGGER IF EXISTS trg_epis_fichas_updated ON public.epis_fichas;
CREATE TRIGGER trg_epis_fichas_updated BEFORE UPDATE ON public.epis_fichas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Itens da ficha
CREATE TABLE IF NOT EXISTS public.epis_fichas_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_id UUID NOT NULL REFERENCES public.epis_fichas(id) ON DELETE CASCADE,
  epi_id UUID REFERENCES public.epis(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  ca TEXT,
  ca_validade DATE,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  data_entrega DATE NOT NULL DEFAULT CURRENT_DATE,
  data_devolucao DATE,
  status_item TEXT NOT NULL DEFAULT 'em_uso' CHECK (status_item IN ('em_uso','devolvido','substituido','descartado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_epis_itens_ficha ON public.epis_fichas_itens(ficha_id);
CREATE INDEX IF NOT EXISTS idx_epis_itens_status ON public.epis_fichas_itens(status_item);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.epis_fichas_itens TO authenticated;
GRANT ALL ON public.epis_fichas_itens TO service_role;
ALTER TABLE public.epis_fichas_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Itens EPI seguem ficha" ON public.epis_fichas_itens;
CREATE POLICY "Itens EPI seguem ficha"
ON public.epis_fichas_itens FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.epis_fichas f
  JOIN public.user_empresas ue ON ue.empresa_id = f.empresa_id
  WHERE f.id = epis_fichas_itens.ficha_id AND ue.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.epis_fichas f
  JOIN public.user_empresas ue ON ue.empresa_id = f.empresa_id
  WHERE f.id = epis_fichas_itens.ficha_id AND ue.user_id = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
));

-- Assinaturas (imutáveis)
CREATE TABLE IF NOT EXISTS public.epis_fichas_assinaturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_id UUID NOT NULL UNIQUE REFERENCES public.epis_fichas(id) ON DELETE CASCADE,
  assinatura_tipo TEXT NOT NULL CHECK (assinatura_tipo IN ('canvas','webauthn','biometria_mobile')),
  assinatura_dados TEXT NOT NULL,
  hash_sha256 TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  assinado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.epis_fichas_assinaturas TO authenticated;
GRANT ALL ON public.epis_fichas_assinaturas TO service_role;
ALTER TABLE public.epis_fichas_assinaturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assinatura visível para membros da empresa" ON public.epis_fichas_assinaturas;
CREATE POLICY "Assinatura visível para membros da empresa"
ON public.epis_fichas_assinaturas FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.epis_fichas f
  JOIN public.user_empresas ue ON ue.empresa_id = f.empresa_id
  WHERE f.id = epis_fichas_assinaturas.ficha_id AND ue.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Assinatura inserida por admin/rh" ON public.epis_fichas_assinaturas;
CREATE POLICY "Assinatura inserida por admin/rh"
ON public.epis_fichas_assinaturas FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.epis_fichas f
  JOIN public.user_empresas ue ON ue.empresa_id = f.empresa_id
  WHERE f.id = epis_fichas_assinaturas.ficha_id AND ue.user_id = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
));

-- Validação de CA vencido na entrega
CREATE OR REPLACE FUNCTION public.validate_epi_item_ca()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ca_validade IS NOT NULL AND NEW.status_item = 'em_uso' AND NEW.data_entrega > NEW.ca_validade THEN
    RAISE EXCEPTION 'CA % vencido em % — não é permitido entregar EPI com CA vencido', NEW.ca, NEW.ca_validade;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_epi_item_ca ON public.epis_fichas_itens;
CREATE TRIGGER trg_epi_item_ca BEFORE INSERT OR UPDATE ON public.epis_fichas_itens
FOR EACH ROW EXECUTE FUNCTION public.validate_epi_item_ca();
