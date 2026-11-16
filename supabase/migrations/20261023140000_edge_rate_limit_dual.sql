-- =============================================================================
-- RATE LIMIT DUPLO E ATÔMICO — quota por EMPRESA + quota por USUÁRIO
-- =============================================================================
-- MOTIVAÇÃO (SaaS multiempresa)
--   O limite anterior era apenas por usuário: 5 usuários diferentes da mesma
--   empresa podiam consumir 25 gerações/hora sem nenhum teto de tenant. Ao
--   mesmo tempo, um único usuário atuando em duas empresas podia consumir toda
--   a quota de uma delas.
--
-- SOLUÇÃO
--   Uma ÚNICA transação verifica os dois baldes e só consome quota quando AMBOS
--   estão abaixo do limite. Advisory locks são adquiridos em ordem determinística
--   (evita deadlock entre chamadas concorrentes). Assim:
--     • nenhuma quota é consumida parcialmente;
--     • duas instâncias da Edge Function compartilham o mesmo estado (banco);
--     • empresas diferentes têm baldes independentes.
--
--   A unicidade/duplicidade continua sendo tratada ANTES desta chamada
--   (idempotência no worker), então solicitação repetida não chega aqui.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.edge_rate_limit_check_dual(
  p_empresa_key   text,
  p_empresa_limit int,
  p_usuario_key   text,
  p_usuario_limit int,
  p_window_sec    int,
  p_now           bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start      bigint;
  v_empresa_count     bigint;
  v_usuario_count     bigint;
  v_empresa_remaining int;
  v_usuario_remaining int;
  v_reason            text;
  v_tem_usuario       boolean;
BEGIN
  IF coalesce(trim(p_empresa_key), '') = '' THEN
    RAISE EXCEPTION 'chave_empresa_obrigatoria';
  END IF;
  IF p_empresa_limit < 1 THEN
    RAISE EXCEPTION 'limite_empresa_invalido';
  END IF;
  IF p_window_sec < 1 THEN
    RAISE EXCEPTION 'janela_invalida';
  END IF;

  -- Usuário é OPCIONAL: o worker automático pode não ter identidade confiável.
  -- Nesse caso o teto da empresa continua sendo aplicado (nunca se inventa user).
  v_tem_usuario := p_usuario_key IS NOT NULL
                   AND trim(p_usuario_key) <> ''
                   AND coalesce(p_usuario_limit, 0) >= 1;
  IF NOT v_tem_usuario AND p_usuario_key IS NOT NULL AND trim(p_usuario_key) <> ''
     AND coalesce(p_usuario_limit, 0) < 1 THEN
    RAISE EXCEPTION 'limite_usuario_invalido';
  END IF;

  v_window_start := p_now - p_window_sec;

  -- Ordem determinística: duas chamadas concorrentes adquirem os mesmos locks
  -- na mesma sequência (sem deadlock).
  IF v_tem_usuario THEN
    PERFORM pg_advisory_xact_lock(hashtext('rl:' || least(p_empresa_key, p_usuario_key))::bigint);
    PERFORM pg_advisory_xact_lock(hashtext('rl:' || greatest(p_empresa_key, p_usuario_key))::bigint);
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext('rl:' || p_empresa_key)::bigint);
  END IF;

  DELETE FROM public.rate_limits
   WHERE key = p_empresa_key
     AND timestamp < v_window_start;
  IF v_tem_usuario THEN
    DELETE FROM public.rate_limits
     WHERE key = p_usuario_key
       AND timestamp < v_window_start;
  END IF;

  SELECT count(*) INTO v_empresa_count
  FROM public.rate_limits
  WHERE key = p_empresa_key AND timestamp >= v_window_start;

  IF v_tem_usuario THEN
    SELECT count(*) INTO v_usuario_count
    FROM public.rate_limits
    WHERE key = p_usuario_key AND timestamp >= v_window_start;
  ELSE
    v_usuario_count := 0;
  END IF;

  v_empresa_remaining := greatest(p_empresa_limit - v_empresa_count, 0);
  v_usuario_remaining := CASE
    WHEN v_tem_usuario THEN greatest(p_usuario_limit - v_usuario_count, 0)
    ELSE 0
  END;

  IF v_empresa_count >= p_empresa_limit THEN
    v_reason := 'empresa';
  ELSIF v_tem_usuario AND v_usuario_count >= p_usuario_limit THEN
    v_reason := 'usuario';
  END IF;

  IF v_reason IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', v_reason,
      'empresa_current', v_empresa_count,
      'empresa_limit', p_empresa_limit,
      'empresa_remaining', v_empresa_remaining,
      'usuario_current', v_usuario_count,
      'usuario_limit', CASE WHEN v_tem_usuario THEN p_usuario_limit ELSE 0 END,
      'usuario_remaining', v_usuario_remaining,
      'reset', v_window_start + p_window_sec
    );
  END IF;

  -- Só consome quando os baldes aplicáveis permitem (sem consumo parcial).
  IF v_tem_usuario THEN
    INSERT INTO public.rate_limits (key, timestamp)
    VALUES (p_empresa_key, p_now), (p_usuario_key, p_now);
  ELSE
    INSERT INTO public.rate_limits (key, timestamp)
    VALUES (p_empresa_key, p_now);
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', NULL,
    'empresa_current', v_empresa_count + 1,
    'empresa_limit', p_empresa_limit,
    'empresa_remaining', p_empresa_limit - v_empresa_count - 1,
    'usuario_current', CASE WHEN v_tem_usuario THEN v_usuario_count + 1 ELSE 0 END,
    'usuario_limit', CASE WHEN v_tem_usuario THEN p_usuario_limit ELSE 0 END,
    'usuario_remaining', CASE WHEN v_tem_usuario THEN p_usuario_limit - v_usuario_count - 1 ELSE 0 END,
    'reset', v_window_start + p_window_sec
  );
END
$$;

COMMENT ON FUNCTION public.edge_rate_limit_check_dual(text, int, text, int, int, bigint) IS
  'Rate limit atômico com dois baldes (empresa + usuário). Só consome quota se ambos permitirem. Exclusivo do backend.';

REVOKE ALL ON FUNCTION public.edge_rate_limit_check_dual(text, int, text, int, int, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.edge_rate_limit_check_dual(text, int, text, int, int, bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_rate_limit_check_dual(text, int, text, int, int, bigint) TO service_role;
