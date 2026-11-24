-- ok = fn_auto_generate_training_certificate() existe, não lê mais
-- catalogo_cursos.metadata, mantém SECURITY DEFINER + search_path=public e segue
-- sem EXECUTE para anon/authenticated.
SELECT 'ok'
FROM pg_proc p
WHERE p.oid = to_regprocedure('public.fn_auto_generate_training_certificate()')
  AND p.prosrc NOT ILIKE '%metadata%'
  AND p.prosrc ILIKE '%INSERT INTO public.treinamento_certificados%'
  AND p.prosecdef
  AND p.proconfig = ARRAY['search_path=public']
  AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
  AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE');
