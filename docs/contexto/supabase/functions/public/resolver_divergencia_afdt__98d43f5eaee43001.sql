CREATE OR REPLACE FUNCTION public.resolver_divergencia_afdt(_divergencia_id uuid, _observacao text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa uuid;
BEGIN
  SELECT empresa_id INTO v_empresa FROM public.afdt_divergencias WHERE id = _divergencia_id;
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Divergência não encontrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_empresas WHERE user_id = auth.uid() AND empresa_id = v_empresa) THEN
    RAISE EXCEPTION 'Sem permissão para esta empresa';
  END IF;

  UPDATE public.afdt_divergencias
     SET resolvido = true,
         observacao = COALESCE(_observacao, observacao)
   WHERE id = _divergencia_id;

  INSERT INTO public.trilha_auditoria_ponto (empresa_id, colaborador_id, acao, detalhes, executado_por)
  SELECT empresa_id, colaborador_id, 'divergencia_afdt_resolvida',
         jsonb_build_object('divergencia_id', _divergencia_id, 'observacao', _observacao),
         auth.uid()
    FROM public.afdt_divergencias WHERE id = _divergencia_id;
END; $function$
