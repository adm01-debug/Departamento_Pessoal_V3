CREATE OR REPLACE FUNCTION public.clinicas_proximas(p_empresa_id uuid, p_lat numeric, p_lng numeric, p_tipo_exame text DEFAULT NULL::text, p_raio_km numeric DEFAULT 50, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, razao_social text, nome_fantasia text, cidade text, uf text, telefone text, sla_medio_min integer, tipos_exame text[], distancia_km numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    cp.id, cp.razao_social, cp.nome_fantasia, cp.cidade, cp.uf, cp.telefone,
    cp.sla_medio_min, cp.tipos_exame,
    public.distancia_haversine(p_lat, p_lng, cp.geo_lat, cp.geo_lng) AS distancia_km
  FROM public.clinicas_partners cp
  WHERE cp.empresa_id = p_empresa_id
    AND public.pertence_a_empresa(p_empresa_id)
    AND cp.status = 'ativo'
    AND cp.geo_lat IS NOT NULL AND cp.geo_lng IS NOT NULL
    AND (p_tipo_exame IS NULL OR p_tipo_exame = ANY(cp.tipos_exame))
    AND public.distancia_haversine(p_lat, p_lng, cp.geo_lat, cp.geo_lng) <= p_raio_km
  ORDER BY distancia_km ASC NULLS LAST
  LIMIT p_limit;
$function$
