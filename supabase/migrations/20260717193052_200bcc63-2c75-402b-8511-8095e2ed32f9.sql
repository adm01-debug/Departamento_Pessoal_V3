
CREATE TABLE IF NOT EXISTS public.exames_agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  colaborador_id UUID NOT NULL,
  clinica_id UUID NOT NULL REFERENCES public.clinicas_partners(id) ON DELETE RESTRICT,
  tipo_exame TEXT NOT NULL CHECK (tipo_exame IN ('admissional','periodico','demissional','mudanca_funcao','retorno_trabalho')),
  data_agendada TIMESTAMPTZ NOT NULL,
  distancia_km NUMERIC(8,2),
  colaborador_lat NUMERIC(10,7),
  colaborador_lng NUMERIC(10,7),
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','confirmado','realizado','cancelado','faltou','reagendado')),
  observacoes TEXT,
  aso_id UUID,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exames_agend_empresa_status ON public.exames_agendamentos(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_exames_agend_colaborador ON public.exames_agendamentos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_exames_agend_clinica ON public.exames_agendamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_exames_agend_data ON public.exames_agendamentos(data_agendada);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exames_agendamentos TO authenticated;
GRANT ALL ON public.exames_agendamentos TO service_role;

ALTER TABLE public.exames_agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RH/Admin gerenciam agendamentos da empresa" ON public.exames_agendamentos;
CREATE POLICY "RH/Admin gerenciam agendamentos da empresa"
ON public.exames_agendamentos FOR ALL
TO authenticated
USING (
  empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  empresa_id IN (SELECT ue.empresa_id FROM public.user_empresas ue WHERE ue.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP TRIGGER IF EXISTS trg_exames_agend_updated_at ON public.exames_agendamentos;
CREATE TRIGGER trg_exames_agend_updated_at
BEFORE UPDATE ON public.exames_agendamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.distancia_haversine(
  lat1 NUMERIC, lng1 NUMERIC, lat2 NUMERIC, lng2 NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  r CONSTANT NUMERIC := 6371;
  dlat NUMERIC; dlng NUMERIC; a NUMERIC; c NUMERIC;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN round((r * c)::numeric, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.clinicas_proximas(
  p_empresa_id UUID,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_tipo_exame TEXT DEFAULT NULL,
  p_raio_km NUMERIC DEFAULT 50,
  p_limit INT DEFAULT 20
) RETURNS TABLE (
  id UUID, razao_social TEXT, nome_fantasia TEXT, cidade TEXT, uf TEXT,
  telefone TEXT, sla_medio_min INT, tipos_exame TEXT[], distancia_km NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    cp.id, cp.razao_social, cp.nome_fantasia, cp.cidade, cp.uf, cp.telefone,
    cp.sla_medio_min, cp.tipos_exame,
    public.distancia_haversine(p_lat, p_lng, cp.geo_lat, cp.geo_lng) AS distancia_km
  FROM public.clinicas_partners cp
  WHERE cp.empresa_id = p_empresa_id
    AND cp.status = 'ativo'
    AND cp.geo_lat IS NOT NULL AND cp.geo_lng IS NOT NULL
    AND (p_tipo_exame IS NULL OR p_tipo_exame = ANY(cp.tipos_exame))
    AND public.distancia_haversine(p_lat, p_lng, cp.geo_lat, cp.geo_lng) <= p_raio_km
  ORDER BY distancia_km ASC NULLS LAST
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.distancia_haversine(NUMERIC,NUMERIC,NUMERIC,NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.clinicas_proximas(UUID,NUMERIC,NUMERIC,TEXT,NUMERIC,INT) TO authenticated;
