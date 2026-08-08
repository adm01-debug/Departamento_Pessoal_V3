-- =============================================================================
-- Rate limit atômico para Edge Functions
-- =============================================================================
-- A RPC `edge_rate_limit_check` era chamada por supabase/functions/_shared/rateLimit.ts
-- (usada por 54 edge functions) mas NUNCA existiu no banco. Resultado: todas as
-- chamadas caíam no fallback em memória, que é por-instância e some no cold start
-- — proteção efetivamente muito mais fraca do que a projetada.
--
-- Implementação: janela deslizante sobre public.rate_limits, serializada por
-- pg_advisory_xact_lock(hashtext(key)) para eliminar a corrida TOCTOU entre o
-- COUNT e o INSERT quando duas requisições da mesma chave chegam juntas.

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_timestamp
  ON public.rate_limits (key, "timestamp" DESC);

CREATE OR REPLACE FUNCTION public.edge_rate_limit_check(
  p_key        text,
  p_limit      integer,
  p_window_sec integer,
  p_now        bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now          bigint  := COALESCE(p_now, EXTRACT(EPOCH FROM now())::bigint);
  v_window_start bigint;
  v_current      integer;
  v_allowed      boolean;
BEGIN
  IF p_key IS NULL OR length(p_key) = 0 THEN
    RAISE EXCEPTION 'p_key obrigatório';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'p_limit deve ser >= 1';
  END IF;
  IF p_window_sec IS NULL OR p_window_sec < 1 THEN
    RAISE EXCEPTION 'p_window_sec deve ser >= 1';
  END IF;

  v_window_start := v_now - p_window_sec;

  -- Serializa verificações concorrentes da MESMA chave até o fim da transação.
  PERFORM pg_advisory_xact_lock(hashtext('edge_rate_limit:' || p_key));

  -- Poda oportunista das entradas fora da janela desta chave.
  DELETE FROM public.rate_limits
   WHERE key = p_key
     AND "timestamp" < v_window_start;

  SELECT count(*)::integer
    INTO v_current
    FROM public.rate_limits
   WHERE key = p_key
     AND "timestamp" >= v_window_start;

  v_allowed := v_current < p_limit;

  IF v_allowed THEN
    INSERT INTO public.rate_limits (key, "timestamp") VALUES (p_key, v_now);
    v_current := v_current + 1;
  END IF;

  RETURN jsonb_build_object(
    'allowed',   v_allowed,
    'current',   v_current,
    'limit',     p_limit,
    'remaining', GREATEST(0, p_limit - v_current),
    'reset',     v_window_start + p_window_sec
  );
END;
$$;

-- Somente edge functions (service_role) podem invocar. Nunca o navegador:
-- um cliente capaz de chamar a RPC poderia inflar contadores de terceiros.
REVOKE ALL ON FUNCTION public.edge_rate_limit_check(text, integer, integer, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.edge_rate_limit_check(text, integer, integer, bigint) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_rate_limit_check(text, integer, integer, bigint) TO service_role;

COMMENT ON FUNCTION public.edge_rate_limit_check(text, integer, integer, bigint) IS
  'Rate limit de janela deslizante, atômico via pg_advisory_xact_lock. Exclusivo para edge functions (service_role).';