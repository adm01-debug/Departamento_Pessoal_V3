CREATE OR REPLACE FUNCTION public.sst_regimento_assinar(p_documento_id uuid, p_colaborador_id uuid, p_ip text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_doc RECORD;
  v_hash_ass TEXT;
BEGIN
  IF NOT public.sou_o_colaborador(p_colaborador_id) THEN
    RAISE EXCEPTION 'Sem permissão para assinar em nome deste colaborador';
  END IF;

  SELECT * INTO v_doc FROM public.sst_regimento_documentos WHERE id = p_documento_id;
  IF NOT FOUND OR v_doc.status <> 'PUBLICADO' THEN
    RAISE EXCEPTION 'Documento não publicado';
  END IF;

  v_hash_ass := encode(digest(
    v_doc.hash_sha256 || '|' || p_colaborador_id::text || '|' || now()::text,
    'sha256'
  ), 'hex');

  INSERT INTO public.sst_regimento_assinaturas
    (documento_id, colaborador_id, empresa_id, hash_documento, hash_assinatura, ip_origem, user_agent)
  VALUES
    (p_documento_id, p_colaborador_id, v_doc.empresa_id, v_doc.hash_sha256, v_hash_ass, p_ip, p_user_agent)
  ON CONFLICT (documento_id, colaborador_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'hash_assinatura', v_hash_ass);
END;
$function$
