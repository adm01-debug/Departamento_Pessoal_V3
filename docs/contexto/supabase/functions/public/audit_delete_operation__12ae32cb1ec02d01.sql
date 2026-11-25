CREATE OR REPLACE FUNCTION public.audit_delete_operation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    acao,
    tabela,
    registro_id,
    empresa_id,
    dados_anteriores
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'DELETE',
    TG_TABLE_NAME,
    OLD.id,
    CASE WHEN TG_TABLE_NAME IN ('empresas') THEN OLD.id
         ELSE (OLD.empresa_id)
    END,
    to_jsonb(OLD)
  );
  RETURN OLD;
END;
$function$
