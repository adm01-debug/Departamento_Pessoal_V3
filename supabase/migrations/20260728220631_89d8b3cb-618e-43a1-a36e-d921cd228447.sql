-- ============================================================
-- sst_regimento_assinar: exigia apenas que o documento estivesse
-- publicado. p_colaborador_id vinha do chamador sem qualquer
-- conferência, permitindo registrar assinatura de regimento interno
-- em nome de colaborador de outra empresa (forja de aceite formal).
-- ============================================================
CREATE OR REPLACE FUNCTION public.sst_regimento_assinar(
  p_documento_id uuid,
  p_colaborador_id uuid,
  p_ip text DEFAULT NULL::text,
  p_user_agent text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_doc              RECORD;
  v_hash_ass         TEXT;
  v_colab_empresa_id UUID;
BEGIN
  SELECT * INTO v_doc
    FROM public.sst_regimento_documentos
   WHERE id = p_documento_id;

  IF NOT FOUND OR v_doc.status <> 'PUBLICADO' THEN
    RAISE EXCEPTION 'Documento não publicado';
  END IF;

  -- Quem chama precisa pertencer à empresa do documento.
  -- auth.uid() nulo = contexto service_role (rotina interna).
  IF auth.uid() IS NOT NULL
     AND NOT public.pertence_a_empresa(v_doc.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para assinar este documento'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- O assinante precisa ser colaborador da MESMA empresa do documento.
  SELECT c.empresa_id INTO v_colab_empresa_id
    FROM public.colaboradores c
   WHERE c.id = p_colaborador_id;

  IF v_colab_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_colab_empresa_id <> v_doc.empresa_id THEN
    RAISE EXCEPTION 'Colaborador não pertence à empresa do documento'
      USING ERRCODE = 'insufficient_privilege';
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
$function$;

REVOKE EXECUTE ON FUNCTION public.sst_regimento_assinar(uuid, uuid, text, text) FROM anon;