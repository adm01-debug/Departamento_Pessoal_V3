CREATE OR REPLACE FUNCTION public.admissao_salvar_dados(_token text, _nome text, _cpf text, _data_nascimento date, _email text, _telefone text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token public.admissao_tokens;
BEGIN
  v_token := public._admissao_token_row(_token);
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'token invalido ou expirado' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.admissoes
  SET nome = COALESCE(NULLIF(trim(_nome), ''), nome),
      cpf = COALESCE(NULLIF(trim(_cpf), ''), cpf),
      data_nascimento = COALESCE(_data_nascimento, data_nascimento),
      email = COALESCE(NULLIF(trim(_email), ''), email),
      telefone = COALESCE(NULLIF(trim(_telefone), ''), telefone),
      updated_at = now()
  WHERE id = v_token.admissao_id;

  UPDATE public.admissao_tokens
  SET dados_preenchidos = true, updated_at = now()
  WHERE id = v_token.id;
END;
$function$
