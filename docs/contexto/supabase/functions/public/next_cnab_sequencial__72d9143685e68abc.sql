CREATE OR REPLACE FUNCTION public.next_cnab_sequencial(p_empresa_id uuid, p_banco_codigo text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  actor uuid := auth.uid();
  service_request boolean := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  result integer;
BEGIN
  IF p_empresa_id IS NULL OR p_banco_codigo IS NULL OR btrim(p_banco_codigo) = '' THEN
    RAISE EXCEPTION 'invalid CNAB sequence arguments' USING ERRCODE = '22023';
  END IF;
  IF NOT service_request AND (
    actor IS NULL OR (
      NOT public.is_admin(actor)
      AND NOT EXISTS (
        SELECT 1 FROM public.user_empresas ue
        WHERE ue.user_id = actor AND ue.empresa_id = p_empresa_id
      )
    )
  ) THEN
    RAISE EXCEPTION 'CNAB sequence outside caller tenant' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.cnab_sequencias (empresa_id, banco_codigo, last_seq)
  VALUES (p_empresa_id, p_banco_codigo, 1)
  ON CONFLICT (empresa_id, banco_codigo)
  DO UPDATE SET last_seq = public.cnab_sequencias.last_seq + 1
  RETURNING last_seq INTO result;
  RETURN result;
END
$function$
