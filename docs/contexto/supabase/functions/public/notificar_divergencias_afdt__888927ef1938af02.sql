CREATE OR REPLACE FUNCTION public.notificar_divergencias_afdt(_importacao_id uuid)
 RETURNS TABLE(notificacoes_criadas integer, criticas integer, avisos integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa uuid;
  v_criticas int;
  v_avisos int;
  v_total int;
  v_inseridas int := 0;
BEGIN
  -- Resolve empresa da importação
  SELECT empresa_id INTO v_empresa
  FROM public.afdt_importacoes
  WHERE id = _importacao_id;

  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Importação AFDT não encontrada: %', _importacao_id;
  END IF;

  -- Autorização: apenas admins ou membros da empresa
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_empresas WHERE user_id = auth.uid() AND empresa_id = v_empresa)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para notificar divergências desta empresa';
  END IF;

  -- Contagem de divergências pendentes por severidade
  SELECT
    COUNT(*) FILTER (WHERE tipo = 'sem_colaborador'),
    COUNT(*) FILTER (WHERE tipo IN ('sem_batida','duplicado')),
    COUNT(*)
  INTO v_criticas, v_avisos, v_total
  FROM public.afdt_divergencias
  WHERE importacao_id = _importacao_id AND resolvido = false;

  IF v_total = 0 THEN
    RETURN QUERY SELECT 0, 0, 0;
    RETURN;
  END IF;

  -- Insere 1 notificação por membro da empresa (idempotente via entidade_id)
  WITH destinatarios AS (
    SELECT DISTINCT ue.user_id
    FROM public.user_empresas ue
    WHERE ue.empresa_id = v_empresa
  ),
  inseridas AS (
    INSERT INTO public.notificacoes (
      user_id, empresa_id, titulo, mensagem, tipo, lida,
      entidade_id, entidade_tipo
    )
    SELECT
      d.user_id,
      v_empresa,
      CASE WHEN v_criticas > 0
        THEN format('AFDT: %s divergência(s) crítica(s)', v_criticas)
        ELSE format('AFDT: %s divergência(s) para revisar', v_total)
      END,
      format(
        'Importação AFDT concluída com %s divergências (%s críticas, %s avisos). Acesse /admin/ponto/divergencias.',
        v_total, v_criticas, v_avisos
      ),
      CASE WHEN v_criticas > 0 THEN 'alerta' ELSE 'info' END,
      false,
      _importacao_id,
      'afdt_importacao'
    FROM destinatarios d
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notificacoes n
      WHERE n.user_id = d.user_id
        AND n.entidade_tipo = 'afdt_importacao'
        AND n.entidade_id = _importacao_id
    )
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_inseridas FROM inseridas;

  RETURN QUERY SELECT v_inseridas, v_criticas, v_avisos;
END;
$function$
