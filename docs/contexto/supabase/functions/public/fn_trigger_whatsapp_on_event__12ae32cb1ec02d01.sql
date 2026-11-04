CREATE OR REPLACE FUNCTION public.fn_trigger_whatsapp_on_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Notificação WhatsApp na admissão (best-effort)
  -- Defensive: se a tabela/coluna alvo não existir, ignora silenciosamente
  BEGIN
    IF TG_TABLE_NAME = 'colaboradores' THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'whatsapp_mensagens_logs'
      ) THEN
        INSERT INTO public.whatsapp_mensagens_logs (
          empresa_id, colaborador_id, telefone, status
        ) VALUES (
          COALESCE(
            (NEW.empresa_id)::text,
            '00000000-0000-0000-0000-000000000000'
          )::uuid,
          NEW.id,
          COALESCE(
            current_setting('app.fake_phone', true),
            'pending'
          ),
          'pending_trigger'
        );
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- WhatsApp é um side-effect, nunca pode bloquear o INSERT
    RAISE WARNING '[fn_trigger_whatsapp_on_event] ignorado: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$
