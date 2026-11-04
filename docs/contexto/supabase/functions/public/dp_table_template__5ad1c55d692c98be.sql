CREATE OR REPLACE FUNCTION public.dp_table_template(p_name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  RETURN 
    'CREATE TABLE public.' || quote_ident(p_name) || ' (' || chr(10) ||
    '  id            dp_uuid      PRIMARY KEY,' || chr(10) ||
    '  created_at    dp_timestamp,' || chr(10) ||
    '  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),' || chr(10) ||
    '  deleted_at    TIMESTAMPTZ,' || chr(10) ||
    '  deleted_by    UUID         REFERENCES auth.users(id),' || chr(10) ||
    '  created_by    UUID         REFERENCES auth.users(id)' || chr(10) ||
    ');' || chr(10) ||
    'ALTER TABLE public.' || quote_ident(p_name) || ' ENABLE ROW LEVEL SECURITY;' || chr(10) ||
    'CREATE TRIGGER ' || p_name || '_updated_at BEFORE UPDATE ON public.' || quote_ident(p_name) || chr(10) ||
    '  FOR EACH ROW EXECUTE FUNCTION public.dp_set_updated_at();';
END;
$function$
