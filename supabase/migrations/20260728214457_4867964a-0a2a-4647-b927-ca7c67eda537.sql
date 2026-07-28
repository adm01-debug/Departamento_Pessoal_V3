REVOKE ALL ON FUNCTION public.fn_candidatura_set_empresa() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_candidatura_set_empresa() TO service_role;