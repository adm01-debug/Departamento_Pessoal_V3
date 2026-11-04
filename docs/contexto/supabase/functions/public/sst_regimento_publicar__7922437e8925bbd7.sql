CREATE OR REPLACE FUNCTION public.sst_regimento_publicar(p_documento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_doc RECORD;
  v_hash TEXT;
BEGIN
  SELECT * INTO v_doc FROM public.sst_regimento_documentos WHERE id = p_documento_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- Arquiva versão publicada anterior
  UPDATE public.sst_regimento_documentos
     SET status = 'ARQUIVADO'
   WHERE empresa_id = v_doc.empresa_id AND status = 'PUBLICADO' AND id <> p_documento_id;

  -- Hash canônico do conteúdo
  v_hash := encode(digest(coalesce(v_doc.titulo,'') || '|' || coalesce(v_doc.conteudo_html,'') || '|v' || v_doc.versao, 'sha256'), 'hex');

  UPDATE public.sst_regimento_documentos
     SET status = 'PUBLICADO',
         hash_sha256 = v_hash,
         publicado_em = now(),
         publicado_por = auth.uid()
   WHERE id = p_documento_id;

  RETURN jsonb_build_object('ok', true, 'hash', v_hash);
END;
$function$
