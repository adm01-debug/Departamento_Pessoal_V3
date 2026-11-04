CREATE OR REPLACE FUNCTION public.log_audit_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[];
  current_user_id UUID;
  current_user_email TEXT;
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  current_user_email := (SELECT email FROM auth.users WHERE id = current_user_id);

  IF (TG_OP = 'DELETE') THEN
    old_data := to_jsonb(OLD);
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, user_id, user_email)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', old_data, current_user_id, current_user_email);
    RETURN OLD;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    
    -- Get changed fields
    SELECT array_agg(key) INTO changed_fields
    FROM (
      SELECT key FROM jsonb_each(old_data)
      EXCEPT
      SELECT key FROM jsonb_each(new_data)
      UNION
      SELECT key FROM jsonb_each(new_data)
      EXCEPT  
      SELECT key FROM jsonb_each(old_data)
      UNION
      SELECT o.key FROM jsonb_each(old_data) o
      JOIN jsonb_each(new_data) n ON o.key = n.key
      WHERE o.value IS DISTINCT FROM n.value
    ) changed;
    
    -- Only log if there are actual changes
    IF changed_fields IS NOT NULL AND array_length(changed_fields, 1) > 0 THEN
      INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email)
      VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', old_data, new_data, changed_fields, current_user_id, current_user_email);
    END IF;
    RETURN NEW;
    
  ELSIF (TG_OP = 'INSERT') THEN
    new_data := to_jsonb(NEW);
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_novos, user_id, user_email)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', new_data, current_user_id, current_user_email);
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$
