CREATE OR REPLACE FUNCTION public.revogar_coletor_ponto(_dispositivo_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_empresa_id uuid;
BEGIN
  SELECT d.empresa_id INTO v_empresa_id
  FROM public.ponto_rep_dispositivos d
  WHERE d.id = _dispositivo_id
  FOR UPDATE;

  -- Mesma mensagem para "não existe" e "não é seu": não revela coletor alheio.
  IF v_uid IS NULL
     OR v_empresa_id IS NULL
     OR NOT public.pertence_a_empresa(v_empresa_id)
     OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores da empresa podem gerenciar coletores do relógio de ponto'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.ponto_rep_dispositivos
  SET ativo = false,
      revogado_em = coalesce(revogado_em, now()),
      updated_at = now()
  WHERE id = _dispositivo_id;

  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, empresa_id, dados_novos)
  VALUES ('ponto_rep_dispositivos', _dispositivo_id, 'UPDATE', v_uid, v_empresa_id,
    jsonb_build_object('action', 'revogar_coletor_ponto'));
END;
$function$
