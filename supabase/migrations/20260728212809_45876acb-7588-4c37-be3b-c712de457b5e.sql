-- ---------------------------------------------------------------------------
-- fn_trigger_whatsapp_on_event
--
-- Defeito: referenciava NEW.telefone_pessoal, campo inexistente em
-- public.colaboradores (o próprio comentário dizia "Assume-se este campo no
-- esquema"). Como o gatilho roda em INSERT de colaboradores, TODO cadastro
-- de colaborador falhava com "record new has no field telefone_pessoal".
--
-- Correções:
--  a) usa as colunas reais, em ordem de preferência: whatsapp > celular > telefone;
--  b) telefone é NOT NULL no destino -> sem telefone, não registra (em vez de estourar);
--  c) o envio de notificação NUNCA pode impedir a admissão: falhas são
--     capturadas e registradas, e o INSERT do colaborador segue.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_trigger_whatsapp_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_telefone text;
  v_erro     text;
BEGIN
  IF TG_TABLE_NAME <> 'colaboradores' THEN
    RETURN NEW;
  END IF;

  v_telefone := NULLIF(BTRIM(COALESCE(NEW.whatsapp, NEW.celular, NEW.telefone, '')), '');

  -- Sem telefone não há o que notificar; telefone é obrigatório no destino.
  IF v_telefone IS NULL OR NEW.empresa_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.whatsapp_mensagens_logs (
      empresa_id, colaborador_id, telefone, status
    ) VALUES (
      NEW.empresa_id, NEW.id, v_telefone, 'pending_trigger'
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
    BEGIN
      INSERT INTO public.logs_sistema (nivel, origem, mensagem, detalhes)
      VALUES ('error', 'fn_trigger_whatsapp_on_event',
              'Falha ao enfileirar aviso de WhatsApp na admissão',
              jsonb_build_object('colaborador_id', NEW.id, 'erro', v_erro));
    EXCEPTION WHEN OTHERS THEN
      NULL; -- o log jamais pode derrubar a admissão
    END;
  END;

  RETURN NEW;
END;
$function$;