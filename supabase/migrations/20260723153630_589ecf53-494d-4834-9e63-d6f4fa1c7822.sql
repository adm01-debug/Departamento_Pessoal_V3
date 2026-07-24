
CREATE OR REPLACE FUNCTION public.contrato_lembretes_pendentes()
RETURNS TABLE(processados int, notificados int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proc int := 0;
  v_notif int := 0;
  r RECORD;
  v_gestor uuid;
  v_dias_restantes int;
BEGIN
  FOR r IN
    SELECT t.id, t.contrato_id, t.empresa_id, t.email_destinatario, t.expira_em,
           t.reminders_enviados, cg.colaborador_id
    FROM public.contrato_assinatura_tokens t
    JOIN public.contratos_gerados cg ON cg.id = t.contrato_id
    WHERE t.usado_em IS NULL
      AND t.revogado_em IS NULL
      AND t.expira_em > now()
      AND t.expira_em <= now() + interval '3 days'
      AND (t.ultimo_reminder_at IS NULL OR t.ultimo_reminder_at < now() - interval '20 hours')
      AND COALESCE(t.reminders_enviados, 0) < 3
    LIMIT 200
  LOOP
    v_proc := v_proc + 1;
    v_dias_restantes := GREATEST(0, EXTRACT(DAY FROM r.expira_em - now())::int);

    INSERT INTO public.contrato_token_eventos (token_id, contrato_id, evento, detalhes)
    VALUES (r.id, r.contrato_id, 'reminder_enviado',
            jsonb_build_object('dias_restantes', v_dias_restantes,
                               'destinatario', r.email_destinatario,
                               'tentativa', COALESCE(r.reminders_enviados, 0) + 1));

    SELECT ur.user_id INTO v_gestor
    FROM public.user_empresas ue
    JOIN public.user_roles ur ON ur.user_id = ue.user_id
    WHERE ue.empresa_id = r.empresa_id
      AND ur.role IN ('admin','rh','gestor')
    LIMIT 1;

    IF v_gestor IS NOT NULL THEN
      INSERT INTO public.notificacoes (user_id, empresa_id, tipo, titulo, mensagem, entidade_tipo, entidade_id)
      VALUES (v_gestor, r.empresa_id, 'contrato_pendente',
              'Contrato aguardando assinatura',
              format('Contrato expira em %s dia(s). Destinatário: %s', v_dias_restantes, COALESCE(r.email_destinatario,'—')),
              'contrato_gerado', r.contrato_id);
      v_notif := v_notif + 1;
    END IF;

    UPDATE public.contrato_assinatura_tokens
       SET reminders_enviados = COALESCE(reminders_enviados, 0) + 1,
           ultimo_reminder_at = now()
     WHERE id = r.id;
  END LOOP;

  RETURN QUERY SELECT v_proc, v_notif;
END;
$$;

REVOKE ALL ON FUNCTION public.contrato_lembretes_pendentes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contrato_lembretes_pendentes() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='contrato_lembretes_diario';
    PERFORM cron.schedule(
      'contrato_lembretes_diario',
      '0 12 * * *',
      $CRON$ SELECT public.contrato_lembretes_pendentes(); $CRON$
    );
  END IF;
END $$;
