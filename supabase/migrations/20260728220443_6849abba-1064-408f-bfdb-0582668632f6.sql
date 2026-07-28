-- ============================================================
-- Hardening (parte 2): SECURITY DEFINER sem verificação interna
-- ============================================================

-- 1) clinicas_proximas: p_empresa_id vinha do chamador sem conferência,
--    permitindo listar clínicas parceiras (razão social, telefone) de
--    qualquer outra empresa. Passa a exigir vínculo com o tenant.
CREATE OR REPLACE FUNCTION public.clinicas_proximas(
  p_empresa_id uuid,
  p_lat numeric,
  p_lng numeric,
  p_tipo_exame text DEFAULT NULL::text,
  p_raio_km numeric DEFAULT 50,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  id uuid, razao_social text, nome_fantasia text, cidade text, uf text,
  telefone text, sla_medio_min integer, tipos_exame text[], distancia_km numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    cp.id, cp.razao_social, cp.nome_fantasia, cp.cidade, cp.uf, cp.telefone,
    cp.sla_medio_min, cp.tipos_exame,
    public.distancia_haversine(p_lat, p_lng, cp.geo_lat, cp.geo_lng) AS distancia_km
  FROM public.clinicas_partners cp
  WHERE cp.empresa_id = p_empresa_id
    -- escopo de tenant (auth.uid() nulo = service_role interno)
    AND (auth.uid() IS NULL OR public.pertence_a_empresa(p_empresa_id))
    AND cp.status = 'ativo'
    AND cp.geo_lat IS NOT NULL AND cp.geo_lng IS NOT NULL
    AND (p_tipo_exame IS NULL OR p_tipo_exame = ANY(cp.tipos_exame))
    AND public.distancia_haversine(p_lat, p_lng, cp.geo_lat, cp.geo_lng) <= p_raio_km
  ORDER BY distancia_km ASC NULLS LAST
  LIMIT p_limit;
$function$;

-- 2) get_user_roles: qualquer autenticado podia enumerar os papéis de
--    terceiros (mapa de quem é admin/rh). Restringe a si próprio,
--    admins, e chamadas internas (service_role).
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT array_agg(role)
    FROM public.user_roles
   WHERE user_id = _user_id
     AND (
       auth.uid() IS NULL              -- contexto service_role
       OR _user_id = auth.uid()        -- os próprios papéis
       OR public.is_admin(auth.uid())  -- administração
     )
$function$;

-- 3) Rotinas puramente internas: nenhuma é chamada pelo frontend nem por
--    edge function com JWT de usuário. Ficam restritas ao service_role e
--    às rotinas agendadas (pg_cron), que rodam como owner.
REVOKE EXECUTE ON FUNCTION public.sec_audit_policies_scan()        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sec_verify_seals()               FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sec_policy_regressions_purge()   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_ciencia_rate_limits()    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_ciencia_rate_limit(text, text, integer, integer)
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consumir_pendencias_medida_no_holerite(uuid, uuid, text)
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.garantir_rubrica_suspensao(uuid) FROM anon, authenticated;

-- Função de gatilho: jamais deve ser invocável diretamente pela API.
REVOKE EXECUTE ON FUNCTION public.fn_colaborador_sync_cargo_texto() FROM anon, authenticated;

-- anon não precisa das duas rotinas corrigidas acima
REVOKE EXECUTE ON FUNCTION public.clinicas_proximas(uuid, numeric, numeric, text, numeric, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM anon;