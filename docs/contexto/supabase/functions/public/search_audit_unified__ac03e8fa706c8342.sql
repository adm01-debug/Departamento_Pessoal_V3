CREATE OR REPLACE FUNCTION public.search_audit_unified(_empresa_id uuid DEFAULT NULL::uuid, _user_id uuid DEFAULT NULL::uuid, _source_table text DEFAULT NULL::text, _from timestamp with time zone DEFAULT (now() - '30 days'::interval), _to timestamp with time zone DEFAULT now(), _limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, source_table text, source_id uuid, empresa_id uuid, user_id uuid, action text, entity text, entity_id text, payload jsonb, ip_address inet, occurred_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    a.id, a.source_table, a.source_id, a.empresa_id, a.user_id,
    a.action, a.entity, a.entity_id, a.payload, a.ip_address, a.occurred_at
  FROM public.audit_log_unified a
  WHERE a.occurred_at BETWEEN _from AND _to
    AND (_empresa_id  IS NULL OR a.empresa_id  = _empresa_id)
    AND (_user_id     IS NULL OR a.user_id     = _user_id)
    AND (_source_table IS NULL OR a.source_table = _source_table)
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY a.occurred_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 1000);
$function$
