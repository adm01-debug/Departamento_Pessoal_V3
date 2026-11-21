-- Administração dos coletores do relógio de ponto (Henry + Ponto AtecSoft).
-- Plano: docs/PLANO_INTEGRACAO_PONTO_HENRY_ATECSOFT.md, etapas 73, 75 e 79.
--
-- `ponto_rep_dispositivos` (20261121210000) não aceita escrita do navegador.
-- Estas duas RPCs são o único caminho de escrita a partir da tela de
-- Integrações, e só para admin da própria empresa:
--
-- * gerar_token_coletor_ponto: cria o coletor da unidade ou, se a unidade já
--   tem um, ROTACIONA o token no mesmo registro (mantém id e histórico de
--   lotes/dias, reativa). O token em claro é devolvido UMA vez; no banco fica
--   só o SHA-256 hex minúsculo — o mesmo que a Edge Function `ingest-ponto-rep`
--   calcula do header — e os 8 primeiros caracteres para identificação.
-- * revogar_coletor_ponto: desativa o coletor (o token deixa de valer).
--
-- Cada ação grava em public.audit_log (padrão de admin_set_user_role,
-- 20260718230000), com empresa_id e SEM token nem hash.
-- Aditiva e idempotente: CREATE OR REPLACE, nenhuma tabela ou policy tocada.

CREATE OR REPLACE FUNCTION public.gerar_token_coletor_ponto(_empresa_id uuid, _unidade text, _nome text)
RETURNS TABLE (dispositivo_id uuid, token text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.revogar_coletor_ponto(_dispositivo_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.gerar_token_coletor_ponto(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revogar_coletor_ponto(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gerar_token_coletor_ponto(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revogar_coletor_ponto(uuid) TO authenticated;

COMMENT ON FUNCTION public.gerar_token_coletor_ponto(uuid, text, text) IS
  'Admin da empresa cria o coletor da unidade ou rotaciona o token dele. Devolve o token em claro uma única vez; grava só SHA-256 hex e prefixo.';
COMMENT ON FUNCTION public.revogar_coletor_ponto(uuid) IS
  'Admin da empresa revoga o coletor: ativo=false e revogado_em=now().';
