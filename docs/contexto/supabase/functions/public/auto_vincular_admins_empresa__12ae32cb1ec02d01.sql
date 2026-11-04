CREATE OR REPLACE FUNCTION public.auto_vincular_admins_empresa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_empresas (user_id, empresa_id, is_default)
  SELECT ur.user_id, NEW.id, false FROM public.user_roles ur WHERE ur.role = 'admin'
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$
