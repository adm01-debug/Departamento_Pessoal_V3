CREATE OR REPLACE FUNCTION public.gerar_token_coletor_ponto(_empresa_id uuid, _unidade text, _nome text)
 RETURNS TABLE(dispositivo_id uuid, token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_unidade text := btrim(coalesce(_unidade, ''));
  v_nome text := btrim(coalesce(_nome, ''));
  v_token text;
  v_hash text;
  v_prefixo text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL
     OR NOT public.pertence_a_empresa(_empresa_id)
     OR NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores da empresa podem gerenciar coletores do relógio de ponto'
      USING ERRCODE = '42501';
  END IF;
  IF v_unidade = '' OR char_length(v_unidade) > 60 THEN
    RAISE EXCEPTION 'Unidade obrigatória (até 60 caracteres)' USING ERRCODE = '22023';
  END IF;
  IF v_nome = '' OR char_length(v_nome) > 60 THEN
    RAISE EXCEPTION 'Nome obrigatório (até 60 caracteres)' USING ERRCODE = '22023';
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  v_prefixo := left(v_token, 8);

  SELECT d.id INTO v_id
  FROM public.ponto_rep_dispositivos d
  WHERE d.empresa_id = _empresa_id AND d.unidade = v_unidade
  FOR UPDATE;

  IF v_id IS NULL THEN
    INSERT INTO public.ponto_rep_dispositivos (empresa_id, nome, unidade, token_hash, token_prefixo, criado_por)
    VALUES (_empresa_id, v_nome, v_unidade, v_hash, v_prefixo, v_uid)
    RETURNING id INTO v_id;

    INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, empresa_id, dados_novos)
    VALUES ('ponto_rep_dispositivos', v_id, 'INSERT', v_uid, _empresa_id,
      jsonb_build_object('action', 'gerar_token_coletor_ponto', 'unidade', v_unidade,
                         'nome', v_nome, 'token_prefixo', v_prefixo));
  ELSE
    UPDATE public.ponto_rep_dispositivos
    SET token_hash = v_hash,
        token_prefixo = v_prefixo,
        nome = v_nome,
        ativo = true,
        revogado_em = NULL,
        updated_at = now()
    WHERE id = v_id;

    INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, empresa_id, dados_novos)
    VALUES ('ponto_rep_dispositivos', v_id, 'UPDATE', v_uid, _empresa_id,
      jsonb_build_object('action', 'rotacionar_token_coletor_ponto', 'unidade', v_unidade,
                         'nome', v_nome, 'token_prefixo', v_prefixo));
  END IF;

  dispositivo_id := v_id;
  token := v_token;
  RETURN NEXT;
END;
$function$
