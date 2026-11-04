CREATE OR REPLACE FUNCTION public.contratos_enviar_lembretes_assinatura()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT t.id, t.empresa_id, t.expira_em, t.created_at, t.reminders_enviados,
           col.nome_completo
    FROM public.contrato_assinatura_tokens t
    JOIN public.contratos_gerados c ON c.id = t.contrato_id
    LEFT JOIN public.colaboradores col ON col.id = c.colaborador_id
    WHERE t.usado_em IS NULL
      AND t.expira_em > now()
      AND (
        (t.reminders_enviados = 0 AND t.created_at <= now() - interval '2 days')
        OR (t.reminders_enviados = 1 AND t.created_at <= now() - interval '5 days')
        OR (t.reminders_enviados <= 2 AND t.expira_em <= now() + interval '1 day')
      )
      AND (t.ultimo_reminder_at IS NULL OR t.ultimo_reminder_at <= now() - interval '12 hours')
  LOOP
    INSERT INTO public.notificacoes (user_id, empresa_id, tipo, titulo, mensagem, link, prioridade, created_at)
    SELECT DISTINCT
      ur.user_id,
      r.empresa_id,
      'contrato_assinatura_pendente',
      'Contrato aguardando assinatura',
      format('O contrato de %s está sem assinatura há %s dias. Expira em %s.',
             COALESCE(r.nome_completo, 'colaborador'),
             EXTRACT(DAY FROM (now() - r.created_at))::int,
             to_char(r.expira_em, 'DD/MM/YYYY HH24:MI')),
      '/configuracoes/contratos-templates',
      CASE WHEN r.expira_em <= now() + interval '1 day' THEN 'alta' ELSE 'media' END,
      now()
    FROM public.user_roles ur
    JOIN public.user_empresas ue ON ue.user_id = ur.user_id
    WHERE ue.empresa_id = r.empresa_id
      AND ur.role IN ('admin','rh');

    UPDATE public.contrato_assinatura_tokens
    SET reminders_enviados = reminders_enviados + 1,
        ultimo_reminder_at = now()
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$
