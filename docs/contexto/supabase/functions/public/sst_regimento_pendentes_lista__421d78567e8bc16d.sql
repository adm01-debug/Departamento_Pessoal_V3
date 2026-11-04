CREATE OR REPLACE FUNCTION public.sst_regimento_pendentes_lista(p_empresa_id uuid)
 RETURNS TABLE(colaborador_id uuid, nome text, email text, cargo text, departamento text, tem_usuario boolean, ultima_notificacao timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_doc_id uuid;
  v_versao integer;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'rh')
  ) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  SELECT d.id, d.versao INTO v_doc_id, v_versao
  FROM public.sst_regimento_documentos d
  WHERE d.empresa_id = p_empresa_id AND d.status = 'PUBLICADO'
  ORDER BY d.versao DESC
  LIMIT 1;

  IF v_doc_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    COALESCE(c.nome_completo, c.nome, 'Sem nome')::text,
    c.email::text,
    c.cargo::text,
    c.departamento::text,
    (c.user_id IS NOT NULL) AS tem_usuario,
    (
      SELECT MAX(n.created_at)
      FROM public.notificacoes n
      WHERE n.user_id = c.user_id
        AND n.tipo = 'sst_regimento_pendente'
        AND (n.metadata->>'documento_id')::uuid = v_doc_id
    ) AS ultima_notificacao
  FROM public.colaboradores c
  WHERE c.empresa_id = p_empresa_id
    AND coalesce(c.status::text, 'ativo') = 'ativo'
    AND NOT EXISTS (
      SELECT 1 FROM public.sst_regimento_assinaturas a
      WHERE a.documento_id = v_doc_id AND a.colaborador_id = c.id
    )
  ORDER BY COALESCE(c.nome_completo, c.nome) ASC
  LIMIT 500;
END;
$function$
