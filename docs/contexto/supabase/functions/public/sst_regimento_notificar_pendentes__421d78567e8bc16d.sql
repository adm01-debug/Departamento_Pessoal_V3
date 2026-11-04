CREATE OR REPLACE FUNCTION public.sst_regimento_notificar_pendentes(p_empresa_id uuid)
 RETURNS TABLE(notificados integer, ja_assinados integer, sem_user integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_doc RECORD;
  v_notif int := 0;
  v_assin int := 0;
  v_sem_user int := 0;
BEGIN
  -- Requer papel administrativo na empresa
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado: requer papel administrativo';
  END IF;

  -- Documento vigente
  SELECT id, titulo, versao
    INTO v_doc
    FROM public.sst_regimento_documentos
   WHERE empresa_id = p_empresa_id
     AND status = 'PUBLICADO'
   ORDER BY versao DESC
   LIMIT 1;

  IF v_doc.id IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0;
    RETURN;
  END IF;

  -- Contadores auxiliares
  SELECT count(*) INTO v_assin
    FROM public.sst_regimento_assinaturas a
    JOIN public.colaboradores c ON c.id = a.colaborador_id
   WHERE a.documento_id = v_doc.id
     AND c.empresa_id = p_empresa_id;

  SELECT count(*) INTO v_sem_user
    FROM public.colaboradores c
   WHERE c.empresa_id = p_empresa_id
     AND COALESCE(c.status, 'ativo') = 'ativo'
     AND c.user_id IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.sst_regimento_assinaturas a
        WHERE a.documento_id = v_doc.id AND a.colaborador_id = c.id
     );

  -- Insere notificações para colaboradores ativos, com user_id, ainda não assinantes,
  -- e sem notificação da MESMA versão nos últimos 7 dias (dedupe).
  WITH candidatos AS (
    SELECT c.id AS colaborador_id, c.user_id
      FROM public.colaboradores c
     WHERE c.empresa_id = p_empresa_id
       AND COALESCE(c.status, 'ativo') = 'ativo'
       AND c.user_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.sst_regimento_assinaturas a
          WHERE a.documento_id = v_doc.id
            AND a.colaborador_id = c.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.notificacoes n
          WHERE n.user_id = c.user_id
            AND n.tipo = 'regimento_sst_pendente'
            AND n.entidade_id = v_doc.id
            AND n.created_at > now() - interval '7 days'
       )
  ), ins AS (
    INSERT INTO public.notificacoes
      (user_id, empresa_id, tipo, titulo, mensagem, entidade_tipo, entidade_id, lida)
    SELECT
      user_id,
      p_empresa_id,
      'regimento_sst_pendente',
      'Regimento Interno de SST — assinatura pendente',
      format('Você ainda não assinou %s (versão %s). Acesse o portal para regularizar.',
             v_doc.titulo, v_doc.versao),
      'sst_regimento_documento',
      v_doc.id,
      false
    FROM candidatos
    RETURNING 1
  )
  SELECT count(*) INTO v_notif FROM ins;

  RETURN QUERY SELECT v_notif, v_assin, v_sem_user;
END;
$function$
