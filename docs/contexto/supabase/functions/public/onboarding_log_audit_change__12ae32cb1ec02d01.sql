CREATE OR REPLACE FUNCTION public.onboarding_log_audit_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_campos text[];
  v_user uuid;
  v_email text;
  v_empresa uuid;
BEGIN
  v_user := auth.uid();
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_user;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_empresa := OLD.empresa_id;
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, user_id, user_email, empresa_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', v_old, v_user, v_email, v_empresa);
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_empresa := NEW.empresa_id;

    SELECT array_agg(c.key ORDER BY c.key) INTO v_campos
    FROM (
      SELECT o.key
      FROM jsonb_each(v_old) AS o
      JOIN jsonb_each(v_new) AS n ON n.key = o.key
      WHERE o.value IS DISTINCT FROM n.value
    ) AS c;

    -- `updated_at` sozinho não é mudança de negócio: sem este filtro a trilha
    -- enche de linhas que não dizem nada (o trigger de updated_at dispara em
    -- todo UPDATE).
    IF v_campos IS NOT NULL
       AND array_length(v_campos, 1) > 0
       AND v_campos <> ARRAY['updated_at']::text[] THEN
      INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email, empresa_id)
      VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', v_old, v_new, v_campos, v_user, v_email, v_empresa);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_empresa := NEW.empresa_id;
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_novos, user_id, user_email, empresa_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', v_new, v_user, v_email, v_empresa);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$
