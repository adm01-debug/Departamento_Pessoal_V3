CREATE OR REPLACE FUNCTION public.verificar_espelho_ponto(_espelho_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v record;
  v_canonical_atual jsonb;
  v_hash_atual text;
BEGIN
  SELECT * INTO v FROM public.ponto_espelhos_assinados WHERE id = _espelho_id;
  IF v IS NULL THEN
    RAISE EXCEPTION 'Espelho não encontrado';
  END IF;

  -- Verificar permissão
  IF NOT EXISTS (
    SELECT 1 FROM public.user_empresas
    WHERE user_id = auth.uid() AND empresa_id = v.empresa_id
  ) AND auth.uid() <> v.colaborador_id THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_canonical_atual := public.gerar_canonical_espelho_ponto(v.colaborador_id, v.competencia);
  v_hash_atual := encode(digest(v_canonical_atual::text, 'sha256'), 'hex');

  RETURN jsonb_build_object(
    'espelho_id', v.id,
    'hash_original', v.hash_sha256,
    'hash_atual', v_hash_atual,
    'integro', v.hash_sha256 = v_hash_atual,
    'assinado_em', v.assinado_em,
    'total_batidas_original', v.total_batidas,
    'total_batidas_atual', (v_canonical_atual->>'total_batidas')::int,
    'revogado', EXISTS(SELECT 1 FROM public.ponto_espelhos_revogacoes WHERE espelho_id = v.id)
  );
END;
$function$
