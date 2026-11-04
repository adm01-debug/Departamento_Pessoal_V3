CREATE OR REPLACE FUNCTION public._is_admin_bypass()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role) THEN
      RETURN true;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  RETURN false;
END;
$function$
