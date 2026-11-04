CREATE OR REPLACE FUNCTION public.assinar_espelho_ponto(_colaborador_id uuid, _competencia text, _ip inet DEFAULT NULL::inet, _user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_canonical jsonb;
  v_hash text;
  v_empresa_id uuid;
  v_periodo_inicio date;
  v_periodo_fim date;
  v_espelho_id uuid;
  v_total int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação requerida';
  END IF;

  -- Validar acesso: colaborador assinando o próprio OU admin/RH da empresa
  SELECT c.empresa_id INTO v_empresa_id
    FROM public.colaboradores c
   WHERE c.id = _colaborador_id;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador inválido';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_empresas
    WHERE user_id = auth.uid() AND empresa_id = v_empresa_id
  ) AND auth.uid() <> _colaborador_id THEN
    RAISE EXCEPTION 'Sem permissão para assinar este espelho';
  END IF;

  v_periodo_inicio := to_date(_competencia || '-01', 'YYYY-MM-DD');
  v_periodo_fim := (v_periodo_inicio + interval '1 month' - interval '1 day')::date;

  v_canonical := public.gerar_canonical_espelho_ponto(_colaborador_id, _competencia);
  v_hash := encode(digest(v_canonical::text, 'sha256'), 'hex');
  v_total := (v_canonical->>'total_batidas')::int;

  -- Impedir reassinatura salvo se revogado
  IF EXISTS (
    SELECT 1 FROM public.ponto_espelhos_assinados
    WHERE colaborador_id = _colaborador_id AND competencia = _competencia
      AND NOT EXISTS (
        SELECT 1 FROM public.ponto_espelhos_revogacoes r
        WHERE r.espelho_id = ponto_espelhos_assinados.id
      )
  ) THEN
    RAISE EXCEPTION 'Espelho já assinado para esta competência (revogue antes de reassinar)';
  END IF;

  INSERT INTO public.ponto_espelhos_assinados (
    colaborador_id, empresa_id, competencia,
    periodo_inicio, periodo_fim,
    canonical_json, hash_sha256, total_batidas,
    assinado_por_user_id, assinado_ip, assinado_user_agent,
    assinado_em, data_assinatura_colaborador, status_assinatura
  ) VALUES (
    _colaborador_id, v_empresa_id, _competencia,
    v_periodo_inicio, v_periodo_fim,
    v_canonical, v_hash, v_total,
    auth.uid(), _ip, _user_agent,
    now(), now(), 'assinado'
  )
  RETURNING id INTO v_espelho_id;

  RETURN jsonb_build_object(
    'success', true,
    'espelho_id', v_espelho_id,
    'hash_sha256', v_hash,
    'total_batidas', v_total,
    'competencia', _competencia,
    'assinado_em', now()
  );
END;
$function$
