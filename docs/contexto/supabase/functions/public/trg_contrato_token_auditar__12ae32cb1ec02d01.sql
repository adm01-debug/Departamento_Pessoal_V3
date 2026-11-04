CREATE OR REPLACE FUNCTION public.trg_contrato_token_auditar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.contrato_token_eventos(empresa_id, token_id, contrato_id, evento, detalhes, ator_id)
    VALUES (NEW.empresa_id, NEW.id, NEW.contrato_id, 'gerado',
      jsonb_build_object('expira_em', NEW.expira_em, 'email', NEW.email_destinatario),
      NEW.created_by);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.revogado_em IS NOT NULL AND OLD.revogado_em IS NULL THEN
      INSERT INTO public.contrato_token_eventos(empresa_id, token_id, contrato_id, evento, detalhes, ator_id)
      VALUES (NEW.empresa_id, NEW.id, NEW.contrato_id, 'revogado',
        jsonb_build_object('motivo', NEW.revogacao_motivo), NEW.revogado_por);
    END IF;

    IF NEW.expira_em > OLD.expira_em THEN
      INSERT INTO public.contrato_token_eventos(empresa_id, token_id, contrato_id, evento, detalhes, ator_id)
      VALUES (NEW.empresa_id, NEW.id, NEW.contrato_id, 'estendido',
        jsonb_build_object('de', OLD.expira_em, 'para', NEW.expira_em), auth.uid());
    END IF;

    IF NEW.usado_em IS NOT NULL AND OLD.usado_em IS NULL THEN
      INSERT INTO public.contrato_token_eventos(empresa_id, token_id, contrato_id, evento, detalhes, ip, user_agent)
      VALUES (NEW.empresa_id, NEW.id, NEW.contrato_id, 'assinado',
        jsonb_build_object('hash', NEW.assinatura_hash), NEW.assinado_ip, NEW.assinado_ua);
    END IF;

    IF NEW.reminders_enviados > OLD.reminders_enviados THEN
      INSERT INTO public.contrato_token_eventos(empresa_id, token_id, contrato_id, evento, detalhes)
      VALUES (NEW.empresa_id, NEW.id, NEW.contrato_id, 'lembrete_enviado',
        jsonb_build_object('total', NEW.reminders_enviados, 'em', NEW.ultimo_reminder_at));
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
