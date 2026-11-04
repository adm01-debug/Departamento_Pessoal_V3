CREATE OR REPLACE FUNCTION public.claim_training_image(p_empresa_id uuid, p_content_type text, p_content_id uuid, p_content_hash text, p_prompt_version text DEFAULT NULL::text, p_max_attempts integer DEFAULT 3, p_stale_after interval DEFAULT '00:10:00'::interval)
 RETURNS TABLE(reclamado boolean, id uuid, status text, attempts integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ok      boolean := false;
  v_pasta   text;
  v_linha   public.training_images;
  v_max     integer := least(greatest(coalesce(p_max_attempts, 3), 1), 5);
BEGIN
  IF p_empresa_id IS NULL OR p_content_id IS NULL THEN
    RAISE EXCEPTION 'identificadores_obrigatorios';
  END IF;
  IF p_content_type NOT IN ('course', 'learning_path', 'training_session', 'certificate') THEN
    RAISE EXCEPTION 'tipo_de_conteudo_invalido';
  END IF;
  IF p_content_hash IS NULL OR char_length(p_content_hash) < 8 THEN
    RAISE EXCEPTION 'content_hash_invalido';
  END IF;

  IF p_content_type = 'course' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.catalogo_cursos c
      WHERE c.id = p_content_id AND c.empresa_id = p_empresa_id
    ) INTO v_ok;
    v_pasta := 'courses';
  ELSIF p_content_type = 'learning_path' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trilhas_aprendizado t
      WHERE t.id = p_content_id AND t.empresa_id = p_empresa_id
    ) INTO v_ok;
    v_pasta := 'learning-paths';
  ELSIF p_content_type = 'training_session' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.treinamento_instancias i
      JOIN public.catalogo_cursos c ON c.id = i.curso_id
      WHERE i.id = p_content_id AND c.empresa_id = p_empresa_id
    ) INTO v_ok;
    v_pasta := 'training-sessions';
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.treinamento_certificados tc
      JOIN public.colaboradores col ON col.id = tc.colaborador_id
      LEFT JOIN public.catalogo_cursos c ON c.id = tc.curso_id
      WHERE tc.id = p_content_id
        AND col.empresa_id = p_empresa_id
        AND (tc.curso_id IS NULL OR c.empresa_id = p_empresa_id)
    ) INTO v_ok;
    v_pasta := 'certificates';
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'conteudo_nao_pertence_a_empresa';
  END IF;

  INSERT INTO public.training_images AS t (
    empresa_id, content_type, content_id, storage_path, content_hash,
    status, provider, attempts, prompt_version, requested_at
  )
  VALUES (
    p_empresa_id, p_content_type, p_content_id,
    p_empresa_id::text || '/' || v_pasta || '/' || p_content_id::text || '/cover.webp',
    p_content_hash, 'pending', 'pendente-configuracao', 1, p_prompt_version, now()
  )
  ON CONFLICT (empresa_id, content_type, content_id) DO UPDATE
    SET status         = 'pending',
        -- Conteúdo editado (hash novo) começa uma NOVA versão: tentativas zeram.
        -- Mesma versão: conta mais uma tentativa de processamento.
        attempts       = CASE
                           WHEN t.content_hash IS DISTINCT FROM excluded.content_hash THEN 1
                           ELSE t.attempts + 1
                         END,
        content_hash   = excluded.content_hash,
        prompt_version = excluded.prompt_version,
        requested_at   = now(),
        last_error     = NULL,
        completed_at   = NULL,
        operation_id   = NULL
    WHERE (
        t.status = 'disabled'
        OR t.status = 'failed'
        OR (t.status IN ('pending', 'processing') AND t.requested_at < now() - p_stale_after)
        OR (t.status = 'succeeded' AND t.content_hash IS DISTINCT FROM excluded.content_hash)
      )
      AND (
        -- Versão nova nunca é bloqueada por tentativas de uma versão antiga.
        t.content_hash IS DISTINCT FROM excluded.content_hash
        OR t.status = 'disabled'
        OR t.attempts < v_max
      )
  RETURNING * INTO v_linha;

  IF v_linha.id IS NULL THEN
    SELECT ti.* INTO v_linha
    FROM public.training_images ti
    WHERE ti.empresa_id = p_empresa_id
      AND ti.content_type = p_content_type
      AND ti.content_id = p_content_id;

    RETURN QUERY SELECT false, v_linha.id, v_linha.status, v_linha.attempts;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_linha.id, v_linha.status, v_linha.attempts;
END;
$function$
