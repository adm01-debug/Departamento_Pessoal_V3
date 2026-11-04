CREATE OR REPLACE FUNCTION public.contrato_resolver_template(p_admissao_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa UUID; v_cargo TEXT; v_cargo_id UUID; v_tipo TEXT; v_template UUID;
BEGIN
  SELECT a.empresa_id, a.cargo, COALESCE((a.metadata->>'tipo_contrato'),'clt_indeterminado')
    INTO v_empresa, v_cargo, v_tipo
  FROM public.admissoes a WHERE a.id = p_admissao_id;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Admissão % não encontrada', p_admissao_id; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), v_empresa) THEN
    RAISE EXCEPTION 'Sem acesso a esta admissão';
  END IF;

  SELECT id INTO v_cargo_id FROM public.cargos
    WHERE empresa_id = v_empresa AND lower(nome) = lower(v_cargo) LIMIT 1;

  -- 1) match exato (empresa, tipo, cargo)
  SELECT id INTO v_template FROM public.contrato_templates
    WHERE empresa_id = v_empresa AND tipo_contrato = v_tipo
      AND cargo_id = v_cargo_id AND ativo LIMIT 1;
  -- 2) fallback: mesmo tipo, sem cargo
  IF v_template IS NULL THEN
    SELECT id INTO v_template FROM public.contrato_templates
      WHERE empresa_id = v_empresa AND tipo_contrato = v_tipo
        AND cargo_id IS NULL AND ativo LIMIT 1;
  END IF;
  RETURN v_template;
END; $function$
