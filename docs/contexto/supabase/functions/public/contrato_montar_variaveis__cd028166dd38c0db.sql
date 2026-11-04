CREATE OR REPLACE FUNCTION public.contrato_montar_variaveis(p_admissao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v JSONB;
BEGIN
  SELECT jsonb_build_object(
    'admissao', to_jsonb(a),
    'empresa', to_jsonb(e),
    'cargo', to_jsonb(c),
    'departamento', to_jsonb(d),
    'gerado_em', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
  )
  INTO v
  FROM public.admissoes a
  LEFT JOIN public.empresas e ON e.id = a.empresa_id
  LEFT JOIN public.cargos c ON c.empresa_id = a.empresa_id AND lower(c.nome) = lower(a.cargo)
  LEFT JOIN public.departamentos d ON d.empresa_id = a.empresa_id AND lower(d.nome) = lower(a.departamento)
  WHERE a.id = p_admissao_id;

  IF v IS NULL THEN RAISE EXCEPTION 'Admissão % não encontrada', p_admissao_id; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), (v->'admissao'->>'empresa_id')::uuid) THEN
    RAISE EXCEPTION 'Sem acesso a esta admissão';
  END IF;
  RETURN v;
END; $function$
