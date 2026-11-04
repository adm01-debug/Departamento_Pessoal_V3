CREATE OR REPLACE FUNCTION public.sst_regimento_dashboard(p_empresa_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_doc RECORD;
  v_total_colab INTEGER;
  v_assinados INTEGER;
BEGIN
  IF p_empresa_id NOT IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem acesso à empresa';
  END IF;

  SELECT * INTO v_doc FROM public.sst_regimento_documentos
   WHERE empresa_id = p_empresa_id AND status = 'PUBLICADO' LIMIT 1;

  SELECT count(*) INTO v_total_colab FROM public.colaboradores
   WHERE empresa_id = p_empresa_id
     AND coalesce(status::text, 'ativo') = 'ativo';

  IF v_doc.id IS NULL THEN
    RETURN jsonb_build_object('documento', null, 'total_colaboradores', v_total_colab, 'assinados', 0, 'pendentes', v_total_colab, 'adesao_pct', 0);
  END IF;

  SELECT count(*) INTO v_assinados FROM public.sst_regimento_assinaturas
   WHERE documento_id = v_doc.id;

  RETURN jsonb_build_object(
    'documento', jsonb_build_object('id', v_doc.id, 'titulo', v_doc.titulo, 'versao', v_doc.versao, 'publicado_em', v_doc.publicado_em, 'hash', v_doc.hash_sha256),
    'total_colaboradores', v_total_colab,
    'assinados', v_assinados,
    'pendentes', GREATEST(v_total_colab - v_assinados, 0),
    'adesao_pct', CASE WHEN v_total_colab > 0 THEN round((v_assinados::numeric / v_total_colab) * 100, 2) ELSE 0 END
  );
END;
$function$
