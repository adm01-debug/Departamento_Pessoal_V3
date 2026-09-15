-- P0: public disciplinary acknowledgement is RPC-only. The token table must
-- never be listable or mutable through PostgREST, even when the client omits a
-- token filter.

DO $preflight$
BEGIN
  IF to_regclass('public.medidas_ciencia_tokens') IS NULL THEN
    RAISE EXCEPTION 'P0 token ACL remediation requires public.medidas_ciencia_tokens';
  END IF;
  IF to_regprocedure('public.medida_consultar_por_token(text)') IS NULL
     OR to_regprocedure('public.medida_registrar_ciencia_publica(text,text,text,text,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'P0 token ACL remediation requires the public token RPCs';
  END IF;
END
$preflight$;

DROP POLICY IF EXISTS "Validação pública por token (anon consulta)"
  ON public.medidas_ciencia_tokens;
DROP POLICY IF EXISTS "Registro público de ciência via token"
  ON public.medidas_ciencia_tokens;

REVOKE ALL ON TABLE public.medidas_ciencia_tokens FROM PUBLIC, anon, authenticated;

-- RPC bodies resolve only token_hash, expiry and used_at and lock the row on
-- consumption. Explicit grants keep the public link working without exposing
-- the underlying table.
REVOKE ALL ON FUNCTION public.medida_consultar_por_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.medida_registrar_ciencia_publica(text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.medida_consultar_por_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.medida_registrar_ciencia_publica(text, text, text, text, text, jsonb) TO anon, authenticated, service_role;

COMMENT ON TABLE public.medidas_ciencia_tokens IS
  'Internal token state. Public acknowledgement is available only through hash-validating RPCs.';
